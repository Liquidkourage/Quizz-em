/**
 * Deterministic stand-in for Math.random in tests that deal cards.
 * Values stay in [0.2, 1). Wagering personalities are chosen per seat, not by this roll.
 */
export function seededPassiveRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    return 0.2 + unit * 0.8
  }
}
