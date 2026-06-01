import type { CSSProperties } from 'react'

/**
 * Uniform venue-wall scale — tuned so 100% browser zoom matches the prior 80% zoom layout
 * (20-table floor + stacks sidebar + headline fit one viewport).
 */
export const VENUE_WALL_UI_SCALE = 0.8

/**
 * Pre-zoom bump for type and felt chrome. Visual size ≈ `TYPE_EMPHASIS × UI_SCALE`
 * (1.2 × 0.8 = 0.96 — slightly sharper / roomier than raw transform alone).
 */
export const VENUE_WALL_TYPE_EMPHASIS = 1.2

export function venueWallUiScaleFrameStyle(): CSSProperties {
  return {
    zoom: VENUE_WALL_UI_SCALE,
    width: '100%',
    height: '100%',
    WebkitFontSmoothing: 'antialiased',
  }
}
