import type { CSSProperties } from 'react'

/** Active table count at which the composed showdown stage switches to the locked 20-up rubric. */
export const SHOWDOWN_DENSE_MIN_TABLE_COUNT = 20

/**
 * LOCKED — QA-approved 20-up composed stage tokens (May 2026).
 * Injected on `.vfd-showdown-stage-frame` when {@link isShowdownDenseLayout} is true.
 */
export const SHOWDOWN_STAGE_DENSE_FRAME_VARS = {
  '--vfd-stage-name-size': 'min(8.6cqw, 13.2cqh)',
  '--vfd-stage-name-split-size': 'min(7.4cqw, 11.4cqh)',
  '--vfd-stage-name-split-triple-size': 'min(6.8cqw, 10.6cqh)',
  '--vfd-stage-name-split-quad-size': 'min(6.2cqw, 9.8cqh)',
  '--vfd-stage-pot-size': 'min(10.8cqw, 15.8cqh)',
  '--vfd-stage-diff-size': 'min(7.6cqw, 10.8cqh)',
  '--vfd-stage-card-h': 'max(1.45rem, min(17cqw, 12cqh)',
  '--vfd-stage-card-w': 'max(1rem, min(12cqw, 8.5cqh)',
  '--vfd-stage-card-gap': 'min(0.85cqw, 0.55cqh)',
  '--vfd-stage-crown-h': 'max(1.875rem, min(22cqh, 26cqw)',
} as const

/** Showdown overlay corner badge — rem floor + scale on `--vfd-table-number-size`. */
export const SHOWDOWN_DENSE_TABLE_BADGE = {
  min: '1.25rem',
  scale: 1.5,
} as const

/** Mosaic typography base px for 16–20 tables (`venueFloorPublicTypographyTier` compact). */
export const MOSAIC_20UP_TABLE_NUM_PX = 26

export function isShowdownDenseLayout(tableCount: number): boolean {
  return Math.max(1, Math.floor(tableCount)) >= SHOWDOWN_DENSE_MIN_TABLE_COUNT
}

export function showdownStageDenseFrameStyle(): CSSProperties {
  return { ...SHOWDOWN_STAGE_DENSE_FRAME_VARS } as CSSProperties
}

export function showdownDenseOverlayStyle(): CSSProperties {
  return {
    '--vfd-showdown-dense-table-num-min': SHOWDOWN_DENSE_TABLE_BADGE.min,
    '--vfd-showdown-dense-table-num-scale': String(SHOWDOWN_DENSE_TABLE_BADGE.scale),
  } as CSSProperties
}
