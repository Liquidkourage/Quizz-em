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
