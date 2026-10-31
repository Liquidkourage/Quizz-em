/**
 * Deterministic stand-in for Math.random in tests that run CPU players.
 *
 * Values stay in [0.2, 1), so the virtual players never roll their rare
 * all-in, fold and raise branches (thresholds 0.03, 0.11 and 0.14). Hands are
 * reproducible instead of depending on luck.
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
