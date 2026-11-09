import { answerRevealOpen, answerRevealWaitLabel, type GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'

export type VenueGuessProgress = {
  tableNum: number
  answersSubmitted?: number
  answersExpected?: number
}

export type VenueBetPhaseSig = { br: number; open: boolean; cc: number }

/** Matches server `phaseStrictSignature` for betting phases. */
export function parseVenueBetPhaseSig(sig: string | null | undefined): VenueBetPhaseSig | null {
  if (sig == null || sig === '') return null
  const m = /^bet\|(\d+)\|([TF?])\|cc(\d+)$/.exec(sig)
  if (!m) return null
  return {
    br: Number(m[1]),
    open: m[2] === 'T',
    cc: Number(m[3]) || 0,
  }
}

/** True only when the signature says the betting clock is closed. */
function wageringClockClosed(sig: string | null | undefined): boolean {
  return typeof sig === 'string' && /^bet\|\d+\|F\|cc\d+$/.test(sig)
}

function seatedVenueRows(rows: HostVenueFeltBeatRow[] | null): HostVenueFeltBeatRow[] {
  return rows?.filter((r) => r.active && r.seated > 0) ?? []
}

/** Higher means further through the hand. Tables below the lead are the ones being waited on. */
function feltProgress(row: HostVenueFeltBeatRow): number {
  if (row.phase === 'lobby' || row.phase === 'inactive') return 0
  if (row.phase === 'question') return 10
  if (row.phase !== 'betting') return feltPhaseRank(row.phase)
  const parsed = parseVenueBetPhaseSig(row.phaseStrictSig)
  if (parsed == null) return 20
  return 100 + parsed.br * 20 + parsed.cc * 2 + (parsed.open ? 0 : 1)
}

function feltPhaseRank(phase: string): number {
  if (phase === 'answering') return 1000
  if (phase === 'reveal' || phase === 'showdown') return 1100
  if (phase === 'payout') return 1200
  return 50
}

/** Tables that have not caught the lead felt. Null when every seated table is together. */
function tablesWaitingHint(rows: HostVenueFeltBeatRow[]): string | null {
  if (rows.length < 2) return null
  const lead = Math.max(...rows.map(feltProgress))
  const nums = rows
    .filter((row) => feltProgress(row) < lead)
    .map((row) => row.tableNum)
    .sort((a, b) => a - b)
  if (nums.length === 0) return null
  const word = nums.length === 1 ? 'table' : 'tables'
  return `Waiting on ${word} ${nums.join(', ')}`
}

export function feltInPreBoardBetting(row: HostVenueFeltBeatRow): boolean {
  if (row.phase !== 'betting') return false
  const parsed = parseVenueBetPhaseSig(row.phaseStrictSig)
  return parsed != null && parsed.br === 1 && parsed.cc === 0
}

/** Venue-wide gate for Deal Community Cards — every seated felt must be pre-board with wagering closed. */
export function venueDealCommunityBlockedHint(rows: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueRows(rows)
  if (seated.length === 0) {
    return 'No seated tables at this venue — assign from lobby or seed rehearsal first.'
  }
  const notPreBoard = seated.filter((r) => !feltInPreBoardBetting(r))
  if (notPreBoard.length > 0) {
    const nums = notPreBoard
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    return `Tables ${nums} are not ready for the board (need wagering round 1, no community cards yet). Check Venue felts · beat.`
  }
  const stillOpen = seated.filter((r) => !wageringClockClosed(r.phaseStrictSig))
  if (stillOpen.length > 0) {
    const nums = stillOpen
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    return `Tables ${nums} still have wagering open — close round 1 on every felt before dealing the board.`
  }
  return null
}

/** Venue-wide gate for admin close betting — lockstep + every felt has the clock open. */
export function venueCloseBettingBlockedHint(rows: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueRows(rows)
  if (seated.length === 0) {
    return 'No seated tables at this venue.'
  }
  const waiting = tablesWaitingHint(seated)
  if (waiting) return waiting
  const notOpen = seated.filter((r) => {
    const parsed = parseVenueBetPhaseSig(r.phaseStrictSig)
    return !(r.phase === 'betting' && parsed?.open === true)
  })
  if (notOpen.length > 0) {
    const nums = notOpen
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    const word = notOpen.length === 1 ? 'table' : 'tables'
    return `Waiting on ${word} ${nums} — wagering is not open yet.`
  }
  return null
}

/** Someone still has a betting turn, or guesses are still open, so the answer must stay hidden. */
export function venueRevealAnswerBlockedHint(
  rows: HostVenueFeltBeatRow[] | null,
  guesses?: VenueGuessProgress[] | null,
  nowMs = Date.now(),
): string | null {
  const seated = seatedVenueRows(rows)
  const stillBetting = seated.filter(
    (row) => row.phase === 'betting' && !wageringClockClosed(row.phaseStrictSig),
  )
  if (stillBetting.length > 0) return bettingHoldPhrase(stillBetting)
  const waiting = guessingTablesStillOpen(seated, guesses, nowMs)
  if (waiting.length === 0) return null
  return answerRevealWaitLabel(waiting.map((row) => row.tableNum))
}

function bettingHoldPhrase(rows: HostVenueFeltBeatRow[]): string {
  const sorted = [...rows].sort((a, b) => a.tableNum - b.tableNum)
  if (sorted.length === 1) {
    const row = sorted[0]!
    const n = row.playersToAct
    if (n != null && n > 0) {
      const word = n === 1 ? 'player' : 'players'
      return `Table ${row.tableNum} still has ${n} ${word} betting.`
    }
    return `Table ${row.tableNum} still has a player betting.`
  }
  const parts = sorted.map((row) => {
    const n = row.playersToAct
    return n != null && n > 0 ? `${row.tableNum} (${n})` : String(row.tableNum)
  })
  return `Tables ${parts.join(', ')} still have players betting.`
}

function guessingTablesStillOpen(
  rows: HostVenueFeltBeatRow[],
  guesses: VenueGuessProgress[] | null | undefined,
  nowMs: number,
): HostVenueFeltBeatRow[] {
  const byTable = new Map((guesses ?? []).map((row) => [row.tableNum, row]))
  return rows.filter((row) => {
    if (row.phase !== 'answering') return false
    const guess = byTable.get(row.tableNum)
    return !answerRevealOpen({
      deadlineMs: row.answerDeadlineMs,
      submitted: guess?.answersSubmitted ?? 0,
      expected: guess?.answersExpected ?? row.seated,
      nowMs,
    })
  })
}

/** Venue-wide gate for start answering — lockstep post-board, clock closed, full board. */
export function venueStartAnswerBlockedHint(rows: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueRows(rows)
  if (seated.length === 0) {
    return 'No seated tables at this venue.'
  }
  const waiting = tablesWaitingHint(seated)
  if (waiting) return waiting
  const notReady = seated.filter((r) => {
    const parsed = parseVenueBetPhaseSig(r.phaseStrictSig)
    return !(r.phase === 'betting' && parsed?.br === 2 && parsed.open === false && parsed.cc >= 5)
  })
  if (notReady.length > 0) {
    const nums = notReady
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    const word = notReady.length === 1 ? 'table' : 'tables'
    return `Waiting on ${word} ${nums} — need post-board wagering closed with a full board.`
  }
  return null
}

export function hostDealCommunityGate(args: {
  hasVenueBeat: boolean
  venueBeat: HostVenueFeltBeatRow[] | null
  controlState: GameState
}): { blocked: boolean; hint: string | null } {
  if (args.hasVenueBeat) {
    const hint = venueDealCommunityBlockedHint(args.venueBeat)
    return { blocked: hint != null, hint }
  }
  const round = args.controlState.round
  const bettingRound = round.bettingRound ?? 0
  const communityLen = round.communityCards?.length ?? 0
  const bettingOpen = round.isBettingOpen !== false
  if (args.controlState.phase !== 'betting' || bettingRound !== 1 || communityLen >= 5) {
    const hint =
      args.controlState.phase !== 'betting'
        ? 'Available during wagering (betting phase).'
        : bettingRound !== 1
          ? 'Board already dealt — you are in wagering round 2.'
          : communityLen >= 5
            ? 'Board is already complete.'
            : null
    return { blocked: true, hint }
  }
  if (bettingOpen) {
    return {
      blocked: true,
      hint: 'Close wagering round 1 before dealing the board.',
    }
  }
  return { blocked: false, hint: null }
}

export function hostCloseBettingGate(args: {
  hasVenueBeat: boolean
  venueBeat: HostVenueFeltBeatRow[] | null
  controlState: GameState
}): { blocked: boolean; hint: string | null } {
  const bettingOpen = args.controlState.round.isBettingOpen !== false
  if (args.controlState.phase !== 'betting' || !bettingOpen) {
    return { blocked: true, hint: null }
  }
  if (args.hasVenueBeat) {
    const hint = venueCloseBettingBlockedHint(args.venueBeat)
    return { blocked: hint != null, hint }
  }
  return { blocked: false, hint: null }
}

export function hostStartAnswerGate(args: {
  hasVenueBeat: boolean
  venueBeat: HostVenueFeltBeatRow[] | null
  controlState: GameState
}): { blocked: boolean; hint: string | null } {
  if (args.hasVenueBeat) {
    const hint = venueStartAnswerBlockedHint(args.venueBeat)
    return { blocked: hint != null, hint }
  }
  const round = args.controlState.round
  const bettingRound = round.bettingRound ?? 0
  const communityLen = round.communityCards?.length ?? 0
  const bettingOpen = round.isBettingOpen !== false
  if (
    args.controlState.phase !== 'betting' ||
    bettingOpen ||
    communityLen < 5 ||
    bettingRound !== 2
  ) {
    return {
      blocked: true,
      hint: 'Needs full board (5 community cards) and both wagering rounds closed.',
    }
  }
  return { blocked: false, hint: null }
}

export const WAITING_ON_TABLES_TO_BET = 'Waiting on tables to finish betting'

function openBettingCount(rows: HostVenueFeltBeatRow[]): number {
  return rows.filter((row) => row.phase === 'betting' && !wageringClockClosed(row.phaseStrictSig)).length
}

/** Five or more tables still have a betting clock open. */
export function manyTablesStillBetting(rows: HostVenueFeltBeatRow[] | null): boolean {
  return openBettingCount(seatedVenueRows(rows)) >= 5
}

export type RoomWait = { title: string; nudge: boolean }

/**
 * NEXT follows the room. When seated tables are not on the same step, name the
 * ones behind. Null when the room is together, so the existing button stays.
 */
export function nextBandOverride(rows: HostVenueFeltBeatRow[] | null): RoomWait | null {
  const seated = seatedVenueRows(rows)
  if (seated.length < 2) return null
  const waiting = tablesWaitingHint(seated)
  if (waiting == null) return null
  if (openBettingCount(seated) >= 5) {
    return { title: WAITING_ON_TABLES_TO_BET, nudge: true }
  }
  const nudge = seated.some((row) => row.phase === 'betting' && !wageringClockClosed(row.phaseStrictSig))
  const title = waiting.endsWith('.') ? waiting.slice(0, -1) : waiting
  return { title, nudge }
}

/** Drop a lead-table phase button while the room is split. Keep a rehearsal skip. */
export function dockForRoomWait<T extends { id: string }>(
  built: T[],
  wait: RoomWait | null,
  nudgeItem: T,
): T[] {
  if (wait == null) return built
  const rehearsal = built.filter((item) => item.id === 'rehearsal-skip-showdown')
  return wait.nudge ? [nudgeItem, ...rehearsal] : rehearsal
}
