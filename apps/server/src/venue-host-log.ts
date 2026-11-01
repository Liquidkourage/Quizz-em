import {
  formatTriviaNumber,
  medianSeatedStack,
  previewChipPayoutByPlayerId,
  type GameState,
  type SeatBettingAction,
} from '@qhe/core'
import type {
  DisplayVenueTileSnapshot,
  DisplayVenueSeatingAnnouncement,
  HostVenueActionRow,
  HostVenueBigWinEntry,
  HostVenueBigBetEntry,
  HostVenueBustEntry,
  HostVenueFloorBriefPayload,
  HostVenueMoveLogEntry,
  HostVenueMoveLogKind,
} from '@qhe/net'

const LOG_CAP = 48
const MOVE_LOG_CAP = 200

type VenueHostLog = {
  busts: HostVenueBustEntry[]
  bigWinners: HostVenueBigWinEntry[]
  bigBets: HostVenueBigBetEntry[]
  handBets: HostVenueBigBetEntry[]
  handRoundByTable: Record<number, string>
  moveLog: HostVenueMoveLogEntry[]
  moveSeq: number
}

const venueHostLogs = new Map<string, VenueHostLog>()

type VenueLastHandDisplay = {
  endMs: number
  busts: HostVenueBustEntry[]
  seating: DisplayVenueSeatingAnnouncement | null
}

const venueLastHandDisplay = new Map<string, VenueLastHandDisplay>()

function logForVenue(vn: string): VenueHostLog {
  let log = venueHostLogs.get(vn)
  if (!log) {
    log = {
      busts: [],
      bigWinners: [],
      bigBets: [],
      handBets: [],
      handRoundByTable: {},
      moveLog: [],
      moveSeq: 0,
    }
    venueHostLogs.set(vn, log)
  }
  if (!Array.isArray(log.bigBets)) log.bigBets = []
  if (!Array.isArray(log.handBets)) log.handBets = []
  if (log.handRoundByTable == null) log.handRoundByTable = {}
  if (!Array.isArray(log.moveLog)) log.moveLog = []
  if (typeof log.moveSeq !== 'number') log.moveSeq = 0
  return log
}

export function clearVenueHostLog(vn: string): void {
  venueHostLogs.delete(vn)
  venueLastHandDisplay.delete(vn)
}

export function setVenueLastHandDisplay(vn: string, busts: HostVenueBustEntry[]): void {
  venueLastHandDisplay.set(vn, { endMs: Date.now(), busts, seating: null })
}

export function attachVenueLastHandSeating(
  vn: string,
  seating: DisplayVenueSeatingAnnouncement | null,
): void {
  const cur = venueLastHandDisplay.get(vn)
  if (cur == null) {
    venueLastHandDisplay.set(vn, { endMs: Date.now(), busts: [], seating })
    return
  }
  cur.seating = seating
}

export function getVenueLastHandDisplay(vn: string): VenueLastHandDisplay | null {
  return venueLastHandDisplay.get(vn) ?? null
}

/** Public-TV fields for the hand that just paid. Always includes the end time so a quiet lobby is not the pre-show seating chart. */
export function venueWallLastHandFields(display: VenueLastHandDisplay | null): {
  lastHandEndMs?: number
  lastHandBusts?: { name: string; tableNum: number }[]
  lastHandSeating?: DisplayVenueSeatingAnnouncement
} {
  if (display == null) return {}
  const fields: {
    lastHandEndMs: number
    lastHandBusts?: { name: string; tableNum: number }[]
    lastHandSeating?: DisplayVenueSeatingAnnouncement
  } = { lastHandEndMs: display.endMs }
  if (display.busts.length > 0) {
    fields.lastHandBusts = display.busts.map((b) => ({ name: b.name, tableNum: b.tableNum }))
  }
  if (display.seating != null) fields.lastHandSeating = display.seating
  return fields
}

export function clearVenueLastHandDisplay(vn: string): void {
  venueLastHandDisplay.delete(vn)
}

function bigWinThreshold(gs: GameState): number {
  const bb = typeof gs.bigBlind === 'number' && gs.bigBlind > 0 ? gs.bigBlind : 100
  return Math.max(300, bb * 12)
}

/** Host toast / log label: First L. (never raw human: ids). */
export function shortPlayerName(raw: string): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!s) return 'Player'
  const parts = s.split(' ')
  if (parts[0]!.toUpperCase() === 'CPU' && parts.length >= 2) return s
  if (parts.length === 1) return parts[0]!
  const first = parts[0]!
  const last = parts[parts.length - 1]!
  if (/^[A-Za-z]\.?$/i.test(last)) {
    return `${first} ${last.replace(/\./g, '').charAt(0).toUpperCase()}.`
  }
  const m = last.match(/[A-Za-z]/)
  return m ? `${first} ${m[0]!.toUpperCase()}.` : first
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function chipsJustCommitted(before: GameState, after: GameState, playerId: string): number {
  const prev = before.players.find((p) => p.id === playerId)
  const next = after.players.find((p) => p.id === playerId)
  if (prev != null && next != null) {
    const fromStack = prev.bankroll - next.bankroll
    if (fromStack > 0) return Math.round(fromStack)
  }
  const prevBet = before.round.playerBets?.[playerId] ?? 0
  const nextBet = after.round.playerBets?.[playerId] ?? 0
  return Math.max(0, Math.round(nextBet - prevBet))
}

function formatBettingMoveSummary(
  gs: GameState,
  action: SeatBettingAction,
  name: string,
  committed: number,
): string {
  switch (action) {
    case 'check':
      return `${name} checked`
    case 'call':
      return committed > 0 ? `${name} called ${money(committed)}` : `${name} called`
    case 'raise':
      return `${name} raised to ${money(gs.round.currentBet ?? 0)}`
    case 'fold':
      return `${name} folded (points only)`
    case 'allIn':
      return committed > 0 ? `${name} is all-in for ${money(committed)}` : `${name} is all-in`
    default:
      return `${name} ${action}`
  }
}

function rememberHandBet(
  log: VenueHostLog,
  tableNum: number,
  roundId: string,
  entry: HostVenueBigBetEntry,
): void {
  if (log.handRoundByTable[tableNum] !== roundId) {
    log.handBets = log.handBets.filter((bet) => bet.tableNum !== tableNum)
    log.handRoundByTable[tableNum] = roundId
  }
  log.handBets.unshift(entry)
  if (log.handBets.length > LOG_CAP) log.handBets.length = LOG_CAP
}

function rankedHandBets(bets: HostVenueBigBetEntry[], bigBlind: number): HostVenueBigBetEntry[] {
  return [...bets]
    .filter((bet) => bet.amount >= bigBlind)
    .sort((a, b) => b.amount - a.amount || b.atMs - a.atMs)
    .slice(0, 8)
}

function pushMove(
  log: VenueHostLog,
  entry: Omit<HostVenueMoveLogEntry, 'id'>,
): void {
  log.moveSeq += 1
  log.moveLog.unshift({
    ...entry,
    id: `${entry.atMs}-${entry.tableNum}-${log.moveSeq}`,
  })
  if (log.moveLog.length > MOVE_LOG_CAP) {
    log.moveLog.length = MOVE_LOG_CAP
  }
}

/** Diff two table states and append every new betting action / answer submit to the venue log. */
export function recordVenueMovesBetweenStates(
  vnRaw: string,
  tableNum: number,
  before: GameState,
  after: GameState,
): void {
  if (before === after || !Number.isFinite(tableNum) || tableNum < 1) return
  const vn = vnRaw.trim().toUpperCase()
  const log = logForVenue(vn)
  const now = Date.now()

  const beforeActs = before.round.lastSeatBettingAction ?? []
  const afterActs = after.round.lastSeatBettingAction ?? []
  const beforeById = new Map(before.players.map((p) => [p.id, p]))

  for (let i = 0; i < after.players.length; i++) {
    const p = after.players[i]
    if (!p) continue
    const nextAct = afterActs[i] ?? null
    const prevAct = beforeActs[i] ?? null
    if (nextAct != null && nextAct !== prevAct) {
      const name = shortPlayerName(p.name)
      const committed = chipsJustCommitted(before, after, p.id)
      pushMove(log, {
        atMs: now,
        tableNum,
        playerName: name,
        kind: nextAct as HostVenueMoveLogKind,
        summary: formatBettingMoveSummary(after, nextAct, name, committed),
      })
      if (
        (nextAct === 'call' || nextAct === 'raise' || nextAct === 'allIn') &&
        committed > 0
      ) {
        const bet = {
          name,
          tableNum,
          amount: committed,
          kind: nextAct,
          atMs: now,
        }
        rememberHandBet(log, tableNum, after.round.roundId, bet)
        if (committed >= bigWinThreshold(after)) log.bigBets.unshift(bet)
      }
    }

    const prev = beforeById.get(p.id)
    if (
      typeof p.submittedAnswer === 'number' &&
      Number.isFinite(p.submittedAnswer) &&
      (prev == null || prev.submittedAnswer === undefined)
    ) {
      const name = shortPlayerName(p.name)
      pushMove(log, {
        atMs: now,
        tableNum,
        playerName: name,
        kind: 'submit',
        summary: `${name} submitted ${formatTriviaNumber(p.submittedAnswer)}`,
      })
    }
  }
  log.bigBets = log.bigBets.slice(0, LOG_CAP)
}

function formatActingSummary(tile: DisplayVenueTileSnapshot): string | null {
  const phase = tile.phase
  if (phase === 'betting' && tile.isBettingOpen) {
    const idx = tile.actingSeatIndex
    if (idx == null || idx < 0) return 'Wagering open'
    const name = tile.seatNames[idx]?.trim()
    if (!name) return 'Wagering open'
    const toCall = tile.actingCallAmount
    if (typeof toCall === 'number' && toCall > 0) {
      return `${name} to act · call $${toCall}`
    }
    return `${name} to act`
  }
  if (phase === 'answering') return 'Answering on phones'
  if (phase === 'showdown' || phase === 'reveal') return 'Showdown'
  if (phase === 'question') return 'Dealing'
  if (phase === 'lobby') return 'Between hands'
  return null
}

function recentActionsFromTile(tile: DisplayVenueTileSnapshot): HostVenueActionRow['recentActions'] {
  const acts = tile.seatLastBettingAction
  if (acts == null) return []
  const out: HostVenueActionRow['recentActions'] = []
  for (let i = 0; i < acts.length && i < tile.seatNames.length; i++) {
    const action = acts[i]
    if (action == null) continue
    const name = tile.seatNames[i]?.trim()
    if (!name) continue
    out.push({ seat: i + 1, name, action })
  }
  return out.slice(-4)
}

function contestCountsFromTile(tile: DisplayVenueTileSnapshot): {
  inPotCount: number
  pointsOnlyCount: number
} {
  let inPotCount = 0
  let pointsOnlyCount = 0
  for (let i = 0; i < tile.seatNames.length; i++) {
    if (!tile.seatNames[i]?.trim()) continue
    const busted = tile.seatPointsOnly?.[i] === true
    const folded = tile.seatFolded?.[i] === true
    if (busted || folded) pointsOnlyCount += 1
    else inPotCount += 1
  }
  return { inPotCount, pointsOnlyCount }
}

export function buildHostVenueActionRows(tiles: DisplayVenueTileSnapshot[]): HostVenueActionRow[] {
  return tiles
    .filter((t) => t.seated > 0)
    .map((tile) => {
      const idx = tile.actingSeatIndex
      const actingPlayerName =
        idx != null && idx >= 0 && idx < tile.seatNames.length
          ? tile.seatNames[idx]?.trim() || null
          : null
      const { inPotCount, pointsOnlyCount } = contestCountsFromTile(tile)
      return {
        tableNum: tile.tableNum,
        phase: tile.phase,
        seated: tile.seated,
        pot: tile.pot,
        interestingAction: tile.interestingAction === true,
        actingSeatIndex: idx ?? null,
        actingPlayerName,
        actingSummary: formatActingSummary(tile),
        recentActions: recentActionsFromTile(tile),
        inPotCount,
        pointsOnlyCount,
      }
    })
    .sort((a, b) => {
      if (a.interestingAction !== b.interestingAction) return a.interestingAction ? -1 : 1
      return a.tableNum - b.tableNum
    })
}

export function recordVenueHostHandResults(
  vn: string,
  rows: { tableNum: number; before: GameState; after: GameState }[],
): HostVenueBustEntry[] {
  const log = logForVenue(vn)
  const now = Date.now()
  const handBusts: HostVenueBustEntry[] = []

  for (const { tableNum, before, after } of rows) {
    const threshold = bigWinThreshold(before)
    const payouts = previewChipPayoutByPlayerId(before)
    for (const p of before.players) {
      const amt = payouts[p.id]
      if (typeof amt === 'number' && Number.isFinite(amt) && amt >= threshold) {
        const name = p.name.trim()
        if (!name) continue
        log.bigWinners.unshift({ name, tableNum, amount: Math.round(amt), atMs: now })
      }
    }

    const afterById = new Map(after.players.map((p) => [p.id, p]))
    for (const p of before.players) {
      const next = afterById.get(p.id)
      const newlyPointsOnly = next != null && next.pointsOnly === true && p.pointsOnly !== true
      const removed = next == null
      if (!newlyPointsOnly && !removed) continue
      const name = p.name.trim()
      if (!name) continue
      const entry = { name, tableNum, atMs: now }
      handBusts.push(entry)
      log.busts.unshift(entry)
    }
  }

  log.busts = log.busts.slice(0, LOG_CAP)
  log.bigWinners = log.bigWinners.slice(0, LOG_CAP)
  log.bigBets = log.bigBets.slice(0, LOG_CAP)
  return handBusts
}

export function buildHostVenueFloorBrief(args: {
  venueCode: string
  tiles: DisplayVenueTileSnapshot[]
  fieldPlayerCount: number
  liveTableCount: number
  bigBlindHint: number
  roster?: { playerId: string; name: string; tableNum: number }[]
  venueHeld?: boolean
  shuffleEveryHands?: number
  venueShuffleHeld?: boolean
  handsUntilShuffle?: number | null
  handsCompleted?: number
  lastHandBustCount?: number
  showStartedAtMs?: number | null
  fieldPeakCount?: number
}): HostVenueFloorBriefPayload {
  const log = logForVenue(args.venueCode)
  const bb = args.bigBlindHint > 0 ? args.bigBlindHint : 100
  return {
    actionRows: buildHostVenueActionRows(args.tiles),
    moveLog: log.moveLog.slice(0, MOVE_LOG_CAP),
    busts: log.busts,
    bigWinners: log.bigWinners,
    bigBets: log.bigBets,
    handBets: rankedHandBets(log.handBets, bb),
    bigWinMinAmount: Math.max(300, bb * 12),
    fieldPlayerCount: args.fieldPlayerCount,
    liveTableCount: args.liveTableCount,
    roster: args.roster ?? [],
    venueHeld: args.venueHeld === true,
    shuffleEveryHands: args.shuffleEveryHands ?? 5,
    venueShuffleHeld: args.venueShuffleHeld === true,
    handsUntilShuffle: args.handsUntilShuffle ?? null,
    handsCompleted: Math.max(0, Math.floor(args.handsCompleted ?? 0)),
    lastHandBustCount: Math.max(0, Math.floor(args.lastHandBustCount ?? 0)),
    medianStack: medianSeatedStack(args.tiles),
    showStartedAtMs: args.showStartedAtMs ?? null,
    fieldPeakCount: Math.max(args.fieldPlayerCount, Math.floor(args.fieldPeakCount ?? 0)),
  }
}
