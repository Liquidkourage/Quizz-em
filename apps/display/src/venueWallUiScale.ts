import type { CSSProperties } from 'react'

/**
 * Uniform venue-wall scale — tuned so 100% browser zoom matches the prior 80% zoom layout
 * (20-table floor + stacks sidebar + headline fit one viewport).
 */
export const VENUE_WALL_UI_SCALE = 0.88

/**
 * CSS px so visual size matches `renderedPx` after {@link VENUE_WALL_UI_SCALE} zoom.
 * Typography tokens on the venue wall are authored with this compensation.
 */
export function venueWallCssPxForRendered(renderedPx: number): number {
  return Math.round((renderedPx / VENUE_WALL_UI_SCALE) * 100) / 100
}

/**
 * Pre-zoom bump for type and felt chrome. Visual size ≈ `TYPE_EMPHASIS × UI_SCALE`
 * (1.2 × 0.8 = 0.96 — slightly sharper / roomier than raw transform alone).
 * @deprecated Prefer explicit `--vfd-*` tokens compensated via {@link venueWallCssPxForRendered}.
 */
export const VENUE_WALL_TYPE_EMPHASIS = 1.2

export function venueWallUiScaleFrameStyle(): CSSProperties {
  return {
    zoom: VENUE_WALL_UI_SCALE,
    width: '100%',
    height: '100%',
    WebkitFontSmoothing: 'antialiased',
    ['--venue-wall-ui-scale' as string]: String(VENUE_WALL_UI_SCALE),
  }
}
