export const ANSWER_REVEAL_WARNING_MS = 5_000

export function answerRevealWarning(seconds: number): string {
  const n = Math.max(0, Math.ceil(seconds))
  return `The answer reveals in ${n} ${n === 1 ? 'second' : 'seconds'}.`
}

export type GuessSeat = {
  name?: string
  hand?: readonly unknown[]
  submittedAnswer?: number
  answerForfeited?: boolean
  answerExcused?: boolean
  pointsOnly?: boolean
}

/** A dealt points-only player holds the close. A card-less latecomer cannot build a guess. */
export function seatOwesAGuess(player: GuessSeat): boolean {
  if (typeof player.name !== 'string' || player.name.trim() === '') return false
  if (typeof player.submittedAnswer === 'number' && Number.isFinite(player.submittedAnswer)) return false
  if (player.answerForfeited === true || player.answerExcused === true) return false
  if (player.pointsOnly === true && (player.hand?.length ?? 0) < 2) return false
  return true
}

/** True when the guide is done, or every seat that can guess has locked one. */
export function guessingWindowClosed(args: {
  deadlineMs: number | null
  nowMs: number
  seats: readonly GuessSeat[]
}): boolean {
  const deadline = args.deadlineMs
  if (typeof deadline === 'number' && Number.isFinite(deadline) && args.nowMs >= deadline) return true
  return !args.seats.some(seatOwesAGuess)
}

/** Host may reveal once the guessing clock is done, or once every required guess is in. */
export function answerRevealOpen(args: {
  deadlineMs: number | null
  submitted: number
  expected: number
  nowMs: number
}): boolean {
  const deadline = args.deadlineMs
  if (typeof deadline === 'number' && Number.isFinite(deadline) && args.nowMs >= deadline) return true
  return args.expected > 0 && args.submitted >= args.expected
}

export function answerRevealWaitLabel(tableNums: readonly number[]): string {
  const nums = [...tableNums].filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (nums.length === 1) return `Table ${nums[0]} is still guessing.`
  return `Tables ${nums.join(', ')} are still guessing.`
}
