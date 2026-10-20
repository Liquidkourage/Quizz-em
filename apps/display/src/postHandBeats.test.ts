import { describe, expect, it } from 'vitest'
import {
  POST_HAND_INTERMISSION_MS,
  POST_HAND_PAYOUT_MS,
  POST_HAND_TOTAL_MS,
  postHandBeatsActive,
  resolvePostHandBeat,
} from './postHandBeats'

describe('postHandBeats', () => {
  it('resolves payout then intermission then done', () => {
    const t0 = 1_000_000
    expect(resolvePostHandBeat(t0, t0)).toBe('payout')
    expect(resolvePostHandBeat(t0, t0 + POST_HAND_PAYOUT_MS - 1)).toBe('payout')
    expect(resolvePostHandBeat(t0, t0 + POST_HAND_PAYOUT_MS)).toBe('intermission')
    expect(resolvePostHandBeat(t0, t0 + POST_HAND_TOTAL_MS - 1)).toBe('intermission')
    expect(resolvePostHandBeat(t0, t0 + POST_HAND_TOTAL_MS)).toBe(null)
    expect(postHandBeatsActive(t0, t0 + POST_HAND_INTERMISSION_MS)).toBe(true)
    expect(postHandBeatsActive(t0, t0 + POST_HAND_TOTAL_MS)).toBe(false)
  })
})
