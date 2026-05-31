import type { CSSProperties } from 'react'

/**
 * Uniform venue-wall scale — tuned so 100% browser zoom matches the prior 80% zoom layout
 * (20-table floor + stacks sidebar + headline fit one viewport).
 */
export const VENUE_WALL_UI_SCALE = 0.8

export function venueWallUiScaleFrameStyle(): CSSProperties {
  const inv = `${100 / VENUE_WALL_UI_SCALE}%`
  return {
    transform: `scale(${VENUE_WALL_UI_SCALE})`,
    transformOrigin: 'top left',
    width: inv,
    height: inv,
  }
}
