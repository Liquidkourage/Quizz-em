import { type GameState, previewChipPayoutByPlayerId } from '@qhe/core'
import type {
  DisplayVenueTileSnapshot,
  DisplayVenueSeatingAnnouncement,
  HostVenueActionRow,
  HostVenueBigWinEntry,
  HostVenueBustEntry,
  HostVenueFloorBriefPayload,
} from '@qhe/net'

const LOG_CAP = 48

type VenueHostLog = {
  busts: HostVenueBustEntry[]
  bigWinners: HostVenueBigWinEntry[]
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
    log = { busts: [], bigWinners: [] }
    venueHostLogs.set(vn, log)
  }
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

export function clearVenueLastHandDisplay(vn: string): void {
  venueLastHandDisplay.delete(vn)
}

function bigWinThreshold(gs: GameState): number {
  const bb = typeof gs.bigBlind === 'number' && gs.bigBlind > 0 ? gs.bigBlind : 100
  return Math.max(300, bb * 12)
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

export function buildHostVenueActionRows(tiles: DisplayVenueTileSnapshot[]): HostVenueActionRow[] {
  return tiles
    .filter((t) => t.seated > 0)
    .map((tile) => {
      const idx = tile.actingSeatIndex
      const actingPlayerName =
        idx != null && idx >= 0 && idx < tile.seatNames.length
          ? tile.seatNames[idx]?.trim() || null
          : null
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

    const afterIds = new Set(after.players.map((p) => p.id))
    for (const p of before.players) {
      if (afterIds.has(p.id)) continue
      const name = p.name.trim()
      if (!name) continue
      const entry = { name, tableNum, atMs: now }
      handBusts.push(entry)
      log.busts.unshift(entry)
    }
  }

  log.busts = log.busts.slice(0, LOG_CAP)
  log.bigWinners = log.bigWinners.slice(0, LOG_CAP)
  return handBusts
}

export function buildHostVenueFloorBrief(args: {
  venueCode: string
  tiles: DisplayVenueTileSnapshot[]
  fieldPlayerCount: number
  liveTableCount: number
  bigBlindHint: number
}): HostVenueFloorBriefPayload {
  const log = logForVenue(args.venueCode)
  const bb = args.bigBlindHint > 0 ? args.bigBlindHint : 100
  return {
    actionRows: buildHostVenueActionRows(args.tiles),
    busts: log.busts,
    bigWinners: log.bigWinners,
    bigWinMinAmount: Math.max(300, bb * 12),
    fieldPlayerCount: args.fieldPlayerCount,
    liveTableCount: args.liveTableCount,
  }
}
