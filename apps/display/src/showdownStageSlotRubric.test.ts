import { describe, expect, it } from 'vitest'
import { winnerStageArtScale } from './showdownStageArtLayout'
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
    const landscape = showdownStageSlotRubric('landscape', 14)
    const portrait = showdownStageSlotRubric('portrait', 14)
    expect(portrait.winnerNameY).toBeGreaterThan(landscape.winnerNameY)
    expect(portrait.cardsY).toBeGreaterThan(landscape.cardsY)
  })

  it('raises the difference slot on mid-density floors', () => {
    expect(showdownStageSlotRubric('landscape', 10).diffY).toBe(87.6)
    expect(showdownStageSlotRubric('landscape', 9).diffY).toBe(88.5)
    expect(showdownStageSlotRubric('landscape', 7).diffY).toBe(88.0)
    expect(showdownStageSlotRubric('landscape', 3).diffY).toBe(86.8)
  })

  it('spacious tier nudges anchors for large 4-up tiles', () => {
    const standard = showdownStageSlotRubric('landscape', 6)
    const spacious = showdownStageSlotRubric('landscape', 4)
    expect(spacious.winnerNameY).toBeLessThan(standard.winnerNameY)
    expect(spacious.potY).toBeLessThan(standard.potY)
  })

  it('three-line side ledgers push cards lower', () => {
    const single = showdownStageSlotRubric('landscape', 8, 0)
    const multi = showdownStageSlotRubric('landscape', 8, 3)
    expect(multi.cardsYWithSideLedger).toBeGreaterThan(single.cardsYWithSideLedger)
  })

  it('exports CSS vars for the zoom frame', () => {
    const style = showdownStageRubricStyle('landscape', 14) as Record<string, string>
    expect(style['--vfd-stage-y-winner-name']).toBe('25%')
    expect(style['--vfd-stage-y-pot']).toBe('40%')
    expect(style['--vfd-stage-y-cards']).toBe('50.5%')
  })
})

describe('winnerStageArtScale', () => {
  it('tightens landscape zoom on spacious floors', () => {
    expect(winnerStageArtScale('landscape', 2)).toBe(1.08)
    expect(winnerStageArtScale('landscape', 14)).toBe(1.2)
  })
})
