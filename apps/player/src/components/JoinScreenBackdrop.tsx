import { JOIN_SCREEN_ASSETS } from '../joinScreenAssets'

/** Full-viewport felt plate — suits, glow, floor rail (matches venue welcome wall). */
export default function JoinScreenBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050806]">
      <img
        src={JOIN_SCREEN_ASSETS.backgroundPlate}
        alt=""
        className="player-join-background-plate absolute inset-0 h-full w-full"
        decoding="async"
        draggable={false}
      />
    </div>
  )
}
