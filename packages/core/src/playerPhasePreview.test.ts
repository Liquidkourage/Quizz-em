import { describe, expect, it } from 'vitest'
import { PLAYER_PHASE_PREVIEWS, parsePlayerPhasePreview } from './playerPhasePreview'

describe('parsePlayerPhasePreview', () => {
  it('accepts each player screen and clears on null', () => {
    expect(parsePlayerPhasePreview(null)).toBeNull()
    for (const scene of PLAYER_PHASE_PREVIEWS) {
      expect(parsePlayerPhasePreview(scene.id)).toBe(scene.id)
    }
  })

  it('rejects a screen the phone cannot show', () => {
    expect(parsePlayerPhasePreview('lobby')).toBeUndefined()
    expect(parsePlayerPhasePreview('')).toBeUndefined()
    expect(parsePlayerPhasePreview(1)).toBeUndefined()
    expect(parsePlayerPhasePreview(undefined)).toBeUndefined()
  })
})
