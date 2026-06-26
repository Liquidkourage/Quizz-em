import { WELCOME_WALL_ASSETS } from './welcomeWallAssets'

/** Full-viewport welcome plate — felt, suits, top arc, floor rail (shared across display modes). */
export default function DisplayWelcomeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050806]">
      <img
        src={WELCOME_WALL_ASSETS.backgroundPlate}
        alt=""
        className="welcome-background-plate absolute inset-0 h-full w-full"
        decoding="async"
        draggable={false}
      />
    </div>
  )
}
