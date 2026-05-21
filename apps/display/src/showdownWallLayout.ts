import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'

/** Max numbered felts the venue wall grid is designed to fit on one TV without scrolling. */
export const SHOWDOWN_WALL_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

export type ShowdownWallDensity = 'full' | 'compact' | 'micro'

/**
 * Pick grid width + card density so 1–{@link SHOWDOWN_WALL_MAX_TABLES} tables share one viewport.
 * Landscape TVs: prefer more columns than rows when count is high.
 */
export function showdownWallLayout(tableCount: number): {
  columns: number
  rows: number
  density: ShowdownWallDensity
  gapClass: string
} {
  const n = Math.max(0, Math.min(SHOWDOWN_WALL_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) {
    return { columns: 1, rows: 1, density: 'full', gapClass: 'gap-3' }
  }

  let columns: number
  if (n === 1) columns = 1
  else if (n <= 4) columns = 2
  else if (n <= 9) columns = 3
  else if (n <= 16) columns = 4
  else columns = 5

  const rows = Math.ceil(n / columns)

  /** Keep readable player grids on every table — avoid one-line micro rows up to 20 felts. */
  let density: ShowdownWallDensity
  if (n <= 6) density = 'full'
  else density = 'compact'

  const gapClass = density === 'compact' ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-2.5'

  return { columns, rows, density, gapClass }
}
