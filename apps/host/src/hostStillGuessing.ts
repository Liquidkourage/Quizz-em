import type { HostVenueActionRow, HostVenueFeltBeatRow } from '@qhe/net'

export type StillGuessingPlayer = { name: string; tableNum: number }

function answeringClockDone(felt: HostVenueFeltBeatRow, nowMs: number): boolean {
  if (!felt.active || felt.seated <= 0 || felt.phase !== 'answering') return false
  const deadline = felt.answerDeadlineMs
  return typeof deadline === 'number' && Number.isFinite(deadline) && nowMs >= deadline
}

function tablesWhoseGuessClockIsDone(
  felts: HostVenueFeltBeatRow[] | null | undefined,
  nowMs: number,
): Set<number> {
  const clockDone = new Set<number>()
  for (const felt of felts ?? []) {
    if (answeringClockDone(felt, nowMs)) clockDone.add(felt.tableNum)
  }
  return clockDone
}

function pushOpenGuesses(out: StillGuessingPlayer[], row: HostVenueActionRow): void {
  for (const seat of row.seats) {
    const name = seat.name.trim()
    if (!name || seat.guessLocked === true) continue
    out.push({ name, tableNum: row.tableNum })
  }
}

/** Names still out once that table's answer clock has reached 0. */
export function playersStillGuessing(
  rows: HostVenueActionRow[] | null | undefined,
  felts: HostVenueFeltBeatRow[] | null | undefined,
  nowMs: number,
): StillGuessingPlayer[] {
  const clockDone = tablesWhoseGuessClockIsDone(felts, nowMs)
  if (clockDone.size === 0) return []
  const out: StillGuessingPlayer[] = []
  for (const row of rows ?? []) {
    if (row.phase !== 'answering' || !clockDone.has(row.tableNum)) continue
    pushOpenGuesses(out, row)
  }
  out.sort((a, b) => a.tableNum - b.tableNum || a.name.localeCompare(b.name))
  return out
}
