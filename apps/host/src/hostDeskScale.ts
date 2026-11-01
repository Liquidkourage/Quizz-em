/** Under full size so the Live bottom stays on a laptop screen. 0.9 still clipped it. */
export const HOST_DESK_ZOOM = 0.8

/** Zoom the desk down, and grow its layout box so it still fills the screen. */
export function hostDeskFrameStyle(): { zoom: number; height: string; maxHeight: string } {
  return {
    zoom: HOST_DESK_ZOOM,
    height: `calc(100dvh / ${HOST_DESK_ZOOM})`,
    maxHeight: `calc(100dvh / ${HOST_DESK_ZOOM})`,
  }
}
