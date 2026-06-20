/** Layout math for the bust overlay — expand columns so the list never scrolls. */
const ROW_HEIGHT_PX = 54
const HEADER_BLOCK_PX = 168
const OUTER_PADDING_PX = 96
const MIN_COL_WIDTH_PX = 210
/** Prefer this many rows or fewer — drives column expansion for long lists. */
const TARGET_MAX_ROWS = 8

export type VenueBustGridLayout = {
  columns: number
  compact: boolean
  cardMaxWidth: string
}

export function computeVenueBustGridLayout(
  bustCount: number,
  viewportW: number,
  viewportH: number,
): VenueBustGridLayout {
  if (bustCount <= 0) {
    return { columns: 1, compact: false, cardMaxWidth: 'min(52rem,96vw)' }
  }

  const availableH = Math.max(240, viewportH - OUTER_PADDING_PX - HEADER_BLOCK_PX)
  const maxColsByWidth = Math.max(
    2,
    Math.min(6, Math.floor((viewportW * 0.96) / MIN_COL_WIDTH_PX)),
  )

  let columns = Math.min(maxColsByWidth, Math.max(2, Math.ceil(bustCount / TARGET_MAX_ROWS)))

  while (columns < maxColsByWidth) {
    const rowH = columns >= 5 ? ROW_HEIGHT_PX - 6 : ROW_HEIGHT_PX
    const rows = Math.ceil(bustCount / columns)
    if (rows * rowH <= availableH) break
    columns += 1
  }

  const rows = Math.ceil(bustCount / columns)
  const rowH = columns >= 5 ? ROW_HEIGHT_PX - 6 : ROW_HEIGHT_PX
  const compact = rows >= 9 || columns >= 5 || rows * rowH > availableH * 0.85

  const widthRem = Math.min(96, 24 + columns * 14)
  return {
    columns,
    compact,
    cardMaxWidth: `min(${widthRem}rem,96vw)`,
  }
}
