import { describe, expect, it } from 'vitest'
import { showdownStageDensityTier } from './showdownStageArtLayout'
import {
  MOSAIC_20UP_TABLE_NUM_PX,
  SHOWDOWN_DENSE_MIN_TABLE_COUNT,
  SHOWDOWN_DENSE_TABLE_BADGE,
  SHOWDOWN_STAGE_DENSE_FRAME_VARS,
  isShowdownDenseLayout,
  showdownStageDenseFrameStyle,
} from './showdownStageDenseRubric'

describe('showdownStageDenseRubric (locked 20-up)', () => {
  it('activates at twenty tables, not nineteen', () => {
    expect(isShowdownDenseLayout(19)).toBe(false)
    expect(isShowdownDenseLayout(20)).toBe(true)
    expect(showdownStageDensityTier(19)).toBe('compact')
    expect(showdownStageDensityTier(20)).toBe('dense')
    expect(SHOWDOWN_DENSE_MIN_TABLE_COUNT).toBe(20)
  })

  it('exports the locked frame token set', () => {
    expect(showdownStageDenseFrameStyle()).toEqual(SHOWDOWN_STAGE_DENSE_FRAME_VARS)
    expect(SHOWDOWN_STAGE_DENSE_FRAME_VARS['--vfd-stage-crown-h']).toBe(
      'max(1.875rem, min(22cqh, 26cqw)'
    )
    expect(SHOWDOWN_STAGE_DENSE_FRAME_VARS['--vfd-stage-pot-size']).toBe(
      'min(10.8cqw, 15.8cqh)'
    )
  })

  it('locks showdown corner badge scale', () => {
    expect(SHOWDOWN_DENSE_TABLE_BADGE).toEqual({ min: '1.25rem', scale: 1.5 })
  })

  it('locks mosaic table-number base for compact typography band', () => {
    expect(MOSAIC_20UP_TABLE_NUM_PX).toBe(26)
  })
})
