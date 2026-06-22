import { describe, expect, it } from 'vitest'
import {
  SHOWDOWN_STAGE_RUBRIC_LANDSCAPE,
  showdownStageRubricStyle,
  showdownStageSlotRubric,
} from './showdownStageSlotRubric'

describe('showdownStageSlotRubric', () => {
  it('landscape anchors match winner-stage-preview.html', () => {
    const r = SHOWDOWN_STAGE_RUBRIC_LANDSCAPE
    expect(r.winnerNameY).toBe(25)
    expect(r.potY).toBe(40)
    expect(r.cardsY).toBe(50.5)
    expect(r.cardsWidthPct).toBe(84)
    expect(r.diffY).toBe(86.2)
  })

  it('portrait rubric shifts Y anchors for taller crop', () => {
    const landscape = showdownStageSlotRubric('landscape')
    const portrait = showdownStageSlotRubric('portrait')
    expect(portrait.winnerNameY).toBeGreaterThan(landscape.winnerNameY)
    expect(portrait.cardsY).toBeGreaterThan(landscape.cardsY)
  })

  it('exports CSS vars for the zoom frame', () => {
    const style = showdownStageRubricStyle('landscape') as Record<string, string>
    expect(style['--vfd-stage-y-winner-name']).toBe('25%')
    expect(style['--vfd-stage-y-pot']).toBe('40%')
    expect(style['--vfd-stage-y-cards']).toBe('50.5%')
  })
})
