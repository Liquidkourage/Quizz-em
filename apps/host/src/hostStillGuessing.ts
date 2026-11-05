import type { HostVenueActionRow } from '@qhe/net'

export type StillGuessingPlayer = { name: string; tableNum: number }

function pushOpenGuesses(out: StillGuessingPlayer[], row: HostVenueActionRow): void {
  for (const seat of row.seats) {
    const name = seat.name.trim()
    if (!name || seat.guessLocked === true) continue
    out.push({ name, tableNum: row.tableNum })
  }
}

/** Names on answering tables that have not locked a guess. The host can nudge them before the guide clock ends. */
export function playersStillGuessing(
  rows: HostVenueActionRow[] | null | undefined,
): StillGuessingPlayer[] {
  const out: StillGuessingPlayer[] = []
  for (const row of rows ?? []) {
    if (row.phase !== 'answering') continue
    pushOpenGuesses(out, row)
  }
  out.sort((a, b) => a.tableNum - b.tableNum || a.name.localeCompare(b.name))
  return out
}

/**
 * The desk clock only moves when a timer fires.
 * If the answer deadline is already past, that timer was cleared.
 * Return the current time so the desk clock catches up.
 */
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
