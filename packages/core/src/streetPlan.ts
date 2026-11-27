/** The board is always these five public cards. A street plan only says when each one is revealed. */
export const PUBLIC_CARD_COUNT = 5

/** Bet with no public cards, then bet with all five. */
export const ORIGINAL_STREET_PLAN = [0, 5] as const

/** One betting street, with all five public cards already out. */
export const SINGLE_STREET_PLAN = [5] as const

/** Bet after the first three public cards, then after the last two. */
export const SPLIT_32_STREET_PLAN = [3, 2] as const

const MAX_STREETS = PUBLIC_CARD_COUNT + 1

/** A plan is one count per betting street. The counts are how many public cards that street reveals, and they add up to 5. */
export function acceptedStreetPlan(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_STREETS) return null
  const plan: number[] = []
  let sum = 0
  for (const item of raw) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > PUBLIC_CARD_COUNT) return null
    plan.push(item)
    sum += item
  }
  if (sum !== PUBLIC_CARD_COUNT) return null
  return plan
}

export function streetPlanFrom(raw: unknown): number[] {
  return acceptedStreetPlan(raw) ?? [...ORIGINAL_STREET_PLAN]
}

/** How many public cards the next street reveals. Null when this street is the last. */
export function nextStreetReveal(plan: readonly number[], bettingRound: number): number | null {
  const round = Math.floor(bettingRound)
  if (round < 1 || round >= plan.length) return null
  return plan[round] ?? 0
}
