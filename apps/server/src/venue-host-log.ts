import {
  formatTriviaNumber,
  isVenueTileWageringPaused,
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
  HostVenueSeatContest,
  HostVenueBigBetEntry,
  HostVenueBustEntry,
  HostVenueFloorBriefPayload,
  HostVenueMoveLogEntry,
  HostVenueMoveLogKind,
  VenueWallViewMode,
} from '@qhe/net'

const LOG_CAP = 48
const MOVE_LOG_CAP = 200

type ActingClock = { name: string; sinceMs: number; handStartedAtMs: number | null }

type VenueHostLog = {
  busts: HostVenueBustEntry[]
  bigWinners: HostVenueBigWinEntry[]
  bigBets: HostVenueBigBetEntry[]
  handBets: HostVenueBigBetEntry[]
  handRoundByTable: Record<number, string>
  moveLog: HostVenueMoveLogEntry[]
  moveSeq: number
  actingClockByTable: Record<number, ActingClock>
}

const venueHostLogs = new Map<string, VenueHostLog>()

type VenueLastHandDisplay = {
  endMs: number
  busts: HostVenueBustEntry[]
  seating: DisplayVenueSeatingAnnouncement | null
}

const venueLastHandDisplay = new Map<string, VenueLastHandDisplay>()

/** Player id → latest trivia total. Survives leaving a chair mid-hand. */
const venueTriviaMemory = new Map<string, Map<string, { name: string; answerPoints: number }>>()

function absorbTriviaRow(
  memory: Map<string, { name: string; answerPoints: number }>,
  id: string,
  name: string,
  answerPoints: number,
): void {
  const key = id.trim()
  const label = name.trim()
  if (!key || !label) return
  const pts = Number.isFinite(answerPoints) ? Math.max(0, answerPoints) : 0
  const prev = memory.get(key)
  if (prev && prev.answerPoints > pts) return
  memory.set(key, { name: label, answerPoints: pts })
}

/** Every player seen at this venue, so the trivia board still lists people who left. */
export function rememberVenueTriviaField(
  vnRaw: string,
  games: readonly {
    players: readonly { id: string; name: string; answerPoints?: number }[]
    pointsStandings?: readonly { id: string; name: string; answerPoints: number }[]
  }[],
): { name: string; answerPoints: number }[] {
  const vn = vnRaw.trim().toUpperCase()
  const memory = venueTriviaMemory.get(vn) ?? new Map()
  for (const gs of games) {
    for (const player of gs.players) {
      absorbTriviaRow(memory, player.id, player.name, player.answerPoints ?? 0)
    }
    for (const row of gs.pointsStandings ?? []) {
      absorbTriviaRow(memory, row.id, row.name, row.answerPoints)
    }
  }
  venueTriviaMemory.set(vn, memory)
  return [...memory.values()]
}

/** Clock start for the player listed on a table. A new name means someone just acted. */
export function actingClockSince(
  log: VenueHostLog,
  tableNum: number,
  name: string | null,
  handStartedAtMs: number | null,
  now: number,
): number | null {
  if (!name) {
    delete log.actingClockByTable[tableNum]
    return null
  }
  const prev = log.actingClockByTable[tableNum]
  if (prev && prev.name === name && prev.handStartedAtMs === handStartedAtMs) return prev.sinceMs
  log.actingClockByTable[tableNum] = { name, sinceMs: now, handStartedAtMs }
  return now
}

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
      actingClockByTable: {},
    }
    venueHostLogs.set(vn, log)
  }
  if (!Array.isArray(log.bigBets)) log.bigBets = []
  if (!Array.isArray(log.handBets)) log.handBets = []
  if (log.handRoundByTable == null) log.handRoundByTable = {}
  if (!Array.isArray(log.moveLog)) log.moveLog = []
  if (typeof log.moveSeq !== 'number') log.moveSeq = 0
  if (log.actingClockByTable == null) log.actingClockByTable = {}
  return log
}

export function clearVenueHostLog(vn: string): void {
  venueHostLogs.delete(vn)
  venueLastHandDisplay.delete(vn)
  venueTriviaMemory.delete(vn.trim().toUpperCase())
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

/** A new question starts the hand. Drop that hand's busts and bets. Session wins stay. */
export function clearVenueHostHandOnNewQuestion(vn: string): void {
  const code = vn.trim().toUpperCase()
  const log = logForVenue(code)
  log.handBets = []
  log.handRoundByTable = {}
  const display = venueLastHandDisplay.get(code)
  if (display) display.busts = []
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

function blindForHandBet(gs: GameState): number {
  return typeof gs.bigBlind === 'number' && gs.bigBlind > 0 ? gs.bigBlind : 100
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

/** A big bet is five big blinds or more. At a $20 blind that is $100. */
const BIG_BET_BLIND_MULTIPLE = 5

function countsAsThisHandBigBet(bet: HostVenueBigBetEntry, bigBlind: number): boolean {
  if (bet.kind === 'allIn') return bet.amount > 0
  return bet.amount >= bigBlind * BIG_BET_BLIND_MULTIPLE
}

function rankedHandBets(bets: HostVenueBigBetEntry[], bigBlind: number): HostVenueBigBetEntry[] {
  return [...bets]
    .filter((bet) => countsAsThisHandBigBet(bet, bigBlind))
    .sort((a, b) => b.amount - a.amount || b.atMs - a.atMs)
    .slice(0, 8)
}

function wentAllIn(before: GameState, after: GameState, playerId: string): boolean {
  const prev = before.players.find((p) => p.id === playerId)
  const next = after.players.find((p) => p.id === playerId)
  return prev != null && next != null && prev.isAllIn !== true && next.isAllIn === true
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
  const notedBets = new Set<string>()

  for (let i = 0; i < after.players.length; i++) {
    const p = after.players[i]
    if (!p) continue
    const nextAct = afterActs[i] ?? null
    const prevAct = beforeActs[i] ?? null
    if (nextAct != null && nextAct !== prevAct) {
      noteSeatAction(log, tableNum, before, after, p, nextAct, now, notedBets)
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
  noteClearedAllIns(log, tableNum, before, after, now, notedBets)
  log.bigBets = log.bigBets.slice(0, LOG_CAP)
}

function noteSeatAction(
  log: VenueHostLog,
  tableNum: number,
  before: GameState,
  after: GameState,
  player: GameState['players'][number],
  nextAct: SeatBettingAction,
  now: number,
  notedBets: Set<string>,
): void {
  const name = shortPlayerName(player.name)
  const committed = chipsJustCommitted(before, after, player.id)
  pushMove(log, {
    atMs: now,
    tableNum,
    playerName: name,
    kind: nextAct as HostVenueMoveLogKind,
    summary: formatBettingMoveSummary(after, nextAct, name, committed),
  })
  const betKind = wentAllIn(before, after, player.id) ? 'allIn' : nextAct
  if (betKind !== 'call' && betKind !== 'raise' && betKind !== 'allIn') return
  if (committed <= 0) return
  notedBets.add(player.id)
  const bet = {
    name,
    tableNum,
    amount: committed,
    kind: betKind,
    atMs: now,
  }
  if (countsAsThisHandBigBet(bet, blindForHandBet(after))) {
    rememberHandBet(log, tableNum, after.round.roundId, bet)
  }
  if (committed >= bigWinThreshold(after)) log.bigBets.unshift(bet)
}

function noteClearedAllIns(
  log: VenueHostLog,
  tableNum: number,
  before: GameState,
  after: GameState,
  now: number,
  notedBets: ReadonlySet<string>,
): void {
  for (const p of after.players) {
    if (notedBets.has(p.id) || !wentAllIn(before, after, p.id)) continue
    const committed = chipsJustCommitted(before, after, p.id)
    if (committed <= 0) continue
    const bet = {
      name: shortPlayerName(p.name),
      tableNum,
      amount: committed,
      kind: 'allIn' as const,
      atMs: now,
    }
    if (countsAsThisHandBigBet(bet, blindForHandBet(after))) {
      rememberHandBet(log, tableNum, after.round.roundId, bet)
    }
    if (committed >= bigWinThreshold(after)) log.bigBets.unshift(bet)
  }
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

function guessProgress(tile: DisplayVenueTileSnapshot): { answersSubmitted: number; answersExpected: number } | null {
  if (tile.phase !== 'answering') return null
  const names = tile.seatNames ?? []
  let answersExpected = 0
  let answersSubmitted = 0
  for (let i = 0; i < names.length; i++) {
    if (!names[i]?.trim()) continue
    answersExpected++
    if (tile.seatAnswerLocked?.[i] === true) answersSubmitted++
  }
  return { answersSubmitted, answersExpected }
}

function wholeChips(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.floor(value))
}

function contestReason(busted: boolean, folded: boolean): HostVenueSeatContest['reason'] {
  if (busted) return 'busted'
  if (folded) return 'folded'
  return null
}

function finitePoints(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

function seatContestAt(tile: DisplayVenueTileSnapshot, index: number, name: string): HostVenueSeatContest {
  const busted = tile.seatPointsOnly?.[index] === true
  const reason = contestReason(busted, !busted && tile.seatFolded?.[index] === true)
  const seat: HostVenueSeatContest = {
    name,
    kind: reason == null ? 'pot' : 'points',
    reason,
    ...chipFields(wholeChips(tile.seatBankrolls?.[index]), wholeChips(tile.seatInvested?.[index])),
    ...pointsField(busted, finitePoints(tile.seatAnswerPoints?.[index])),
  }
  if (tile.phase === 'answering') seat.guessLocked = tile.seatAnswerLocked?.[index] === true
  return seat
}

function chipFields(bankroll: number | undefined, invested: number | undefined): Pick<HostVenueSeatContest, 'bankroll' | 'invested'> {
  return {
    ...(bankroll != null ? { bankroll } : {}),
    ...(invested != null ? { invested } : {}),
  }
}

function pointsField(busted: boolean, points: number | undefined): Pick<HostVenueSeatContest, 'answerPoints'> {
  if (!busted || points == null) return {}
  return { answerPoints: points }
}

function appendOffFeltSeats(seats: HostVenueSeatContest[], tile: DisplayVenueTileSnapshot): void {
  const names = tile.unseatedNames ?? []
  const locks = tile.unseatedGuessLocked ?? []
  const answering = tile.phase === 'answering'
  for (let i = 0; i < names.length; i++) {
    const name = names[i]?.trim()
    if (!name) continue
    const seat: HostVenueSeatContest = { name, kind: 'points', reason: null, offFelt: true }
    if (answering) seat.guessLocked = locks[i] === true
    seats.push(seat)
  }
}

function seatContests(tile: DisplayVenueTileSnapshot): HostVenueSeatContest[] {
  const seats: HostVenueSeatContest[] = []
  const names = tile.seatNames ?? []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]?.trim()
    if (!name) continue
    seats.push(seatContestAt(tile, i, name))
  }
  return seats
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
      const seats = seatContests(tile)
      const inPotCount = seats.filter((seat) => seat.kind === 'pot').length
      appendOffFeltSeats(seats, tile)
      return {
        tableNum: tile.tableNum,
        phase: tile.phase,
        seated: tile.seated,
        pot: tile.pot,
        ...(typeof tile.sidePot === 'number' && tile.sidePot > 0 ? { sidePot: tile.sidePot } : {}),
        betsClosed: isVenueTileWageringPaused(tile),
        raisesClosed: tile.raisesClosed === true,
        interestingAction: tile.interestingAction === true,
        actingSeatIndex: idx ?? null,
        actingPlayerName,
        actingSummary: formatActingSummary(tile),
        recentActions: recentActionsFromTile(tile),
        inPotCount,
        pointsOnlyCount: seats.filter((seat) => seat.kind === 'points' && seat.offFelt !== true).length,
        seats,
        ...guessProgress(tile),
      }
    })
    .sort((a, b) => a.tableNum - b.tableNum)
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

function publishedWinnerName(name: string | null | undefined): string | null {
  const trimmed = name?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
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
  handStartedAtMs?: number | null
  /** Epoch ms when the current venue phase began. Null before anyone is seated. */
  phaseStartedAtMs?: number | null
  serverNowMs?: number
  fieldPeakCount?: number
  wallView?: VenueWallViewMode
  winnerScreensReadyAtMs?: number | null
  scoresHint?: string | null
  scoresBlockNextQuestion?: boolean
  endgameWinnerName?: string | null
}): HostVenueFloorBriefPayload {
  const log = logForVenue(args.venueCode)
  const bb = args.bigBlindHint > 0 ? args.bigBlindHint : 100
  const handStartedAtMs = args.handStartedAtMs ?? null
  const now = Date.now()
  return {
    actionRows: buildHostVenueActionRows(args.tiles).map((row) => ({
      ...row,
      actingSinceMs: actingClockSince(
        log,
        row.tableNum,
        row.actingPlayerName,
        handStartedAtMs,
        now,
      ),
    })),
    moveLog: log.moveLog.slice(0, MOVE_LOG_CAP),
    busts: getVenueLastHandDisplay(args.venueCode)?.busts ?? [],
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
    handStartedAtMs: args.handStartedAtMs ?? null,
    phaseStartedAtMs: args.phaseStartedAtMs ?? null,
    serverNowMs: args.serverNowMs,
    fieldPeakCount: Math.max(args.fieldPlayerCount, Math.floor(args.fieldPeakCount ?? 0)),
    wallView: args.wallView ?? 'floor',
    winnerScreensReadyAtMs: args.winnerScreensReadyAtMs ?? null,
    scoresHint: args.scoresHint ?? null,
    scoresBlockNextQuestion: args.scoresBlockNextQuestion === true,
    endgameWinnerName: publishedWinnerName(args.endgameWinnerName),
  }
}
