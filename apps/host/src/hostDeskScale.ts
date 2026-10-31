/** A little under full size so Live fits a laptop without clipping. */
export const HOST_DESK_ZOOM = 0.9

/** Zoom the desk down, and grow its layout box so it still fills the screen. */
export function hostDeskFrameStyle(): { zoom: number; height: string; maxHeight: string } {
  return {
    zoom: HOST_DESK_ZOOM,
    height: `calc(100dvh / ${HOST_DESK_ZOOM})`,
    maxHeight: `calc(100dvh / ${HOST_DESK_ZOOM})`,
  }
}
