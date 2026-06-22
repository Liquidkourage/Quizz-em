export type ShowdownStageArtLayout = 'landscape' | 'portrait'

/** Pick art fit from the winner-stage tile clip box. */
export function showdownStageArtLayoutForBox(width: number, height: number): ShowdownStageArtLayout {
  if (width <= 0 || height <= 0) return 'landscape'
  return width / height < 1.08 ? 'portrait' : 'landscape'
}

export const WINNER_STAGE_ART_SCALE_LANDSCAPE = 1.2
export const WINNER_STAGE_ART_SCALE_PORTRAIT = 1
