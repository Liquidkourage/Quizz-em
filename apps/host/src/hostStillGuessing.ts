import type { HostVenueActionRow, HostVenueSeatContest } from '@qhe/net'

export type StillGuessingPlayer = { name: string; tableNum: number }

export type StillGuessingGroups = {
  contest: StillGuessingPlayer[]
  pointsOnly: StillGuessingPlayer[]
}

function venueStillBetting(rows: readonly HostVenueActionRow[]): boolean {
  return rows.some((row) => row.phase === 'betting')
}

function guessGroup(seat: HostVenueSeatContest): 'skip' | 'contest' | 'points' {
  if (seat.name.trim() === '' || seat.guessLocked === true) return 'skip'
  if (seat.offFelt === true || seat.kind === 'points') return 'points'
  return 'contest'
}

/** Folded chip players still owe a guess. A bust or a late arrival does not. */
function roomWaitsForGuess(seat: HostVenueSeatContest): boolean {
  if (seat.name.trim() === '' || seat.guessLocked === true) return false
  if (seat.offFelt === true || seat.reason === 'busted') return false
  return true
}

function byTableThenName(a: StillGuessingPlayer, b: StillGuessingPlayer): number {
  return a.tableNum - b.tableNum || a.name.localeCompare(b.name)
}

/** Players on a guessing table who have not locked an answer yet. */
export function stillGuessingPlayerCount(rows: HostVenueActionRow[] | null | undefined): number {
  let count = 0
  for (const row of rows ?? []) {
    if (row.phase !== 'answering') continue
    for (const seat of row.seats) {
      if (!roomWaitsForGuess(seat)) continue
      count += 1
    }
  }
  return count
}

/** What the host reads before revealing while guesses are still open. */
export function revealAnswerConfirm(still: number): { cue: string; label: string } | null {
  if (still <= 0) return null
  const people = still === 1 ? '1 player is' : `${still} players are`
  return {
    cue: `${people} still guessing. Reveal the answer anyway?`,
    label: 'Reveal anyway',
  }
}

/** First press asks. The confirm press reveals. A disabled Reveal stays disabled. */
export function withRevealGuessingWarning<
  T extends { id: string; label: string; onClick: () => void; disabled?: boolean; role?: 'primary' | 'secondary' | 'danger' },
>(
  items: T[],
  still: number,
  asking: boolean,
  onAsk: () => void,
  onConfirm: () => void,
  onCancel: () => void,
): T[] {
  const ask = revealAnswerConfirm(still)
  if (ask == null) return items
  const next: T[] = []
  for (const item of items) {
    if (item.id !== 'reveal' || item.disabled) {
      next.push(item)
      continue
    }
    if (!asking) {
      next.push({ ...item, onClick: onAsk })
      continue
    }
    next.push({ ...item, id: 'reveal-confirm', label: ask.label, onClick: onConfirm })
    next.push({ ...item, id: 'reveal-cancel', label: 'Cancel', onClick: onCancel, role: 'secondary', disabled: false })
  }
  return next
}

/** Names still guessing once every table has left the betting round. */
export function playersStillGuessing(
  rows: HostVenueActionRow[] | null | undefined,
): StillGuessingGroups {
  const list = rows ?? []
  if (venueStillBetting(list)) return { contest: [], pointsOnly: [] }
  const contest: StillGuessingPlayer[] = []
  const pointsOnly: StillGuessingPlayer[] = []
  for (const row of list) {
    if (row.phase !== 'answering') continue
    for (const seat of row.seats) {
      const group = guessGroup(seat)
      if (group === 'skip') continue
      const player = { name: seat.name.trim(), tableNum: row.tableNum }
      if (group === 'points') pointsOnly.push(player)
      else contest.push(player)
    }
  }
  contest.sort(byTableThenName)
  pointsOnly.sort(byTableThenName)
  return { contest, pointsOnly }
}

/**
 * The desk clock only moves when a timer fires.
 * If the answer deadline is already past, that timer was cleared.
 * Return the current time so the desk clock catches up.
 */
/** The nudge is available once every answering table's timer has reached its deadline. */
export function guessNudgeReady(deadlines: readonly number[], nowMs: number): boolean {
  let latest = -Infinity
  let any = false
  for (const deadline of deadlines) {
    if (!Number.isFinite(deadline)) continue
    any = true
    if (deadline > latest) latest = deadline
  }
  return any && nowMs >= latest
}

export function guessClockCatchUp(
  deadlines: readonly number[],
  nowMs: number,
  clockNowMs: number,
): number | null {
  let soonest = Infinity
  for (const deadline of deadlines) {
    if (Number.isFinite(deadline) && deadline < soonest) soonest = deadline
  }
  if (!Number.isFinite(soonest) || nowMs < soonest || clockNowMs >= soonest) return null
  return nowMs
}
