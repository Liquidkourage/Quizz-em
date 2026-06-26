import { WELCOME_WALL_ASSETS } from './welcomeWallAssets'

/** Matches welcome wall floor band — used to mask the baked rail on non-welcome screens. */
const WELCOME_FLOOR_BAND_HEIGHT = 'clamp(72px, 10vh, 120px)'

export type DisplayWelcomeBackdropProps = {
  /** Keep baked floor rail + live column glow (welcome wall only). */
  showFloorBand?: boolean
}

/** Full-viewport welcome plate — felt, suits, top arc; optional floor rail at bottom. */
export default function DisplayWelcomeBackdrop({ showFloorBand = false }: DisplayWelcomeBackdropProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050806]">
      <img
        src={WELCOME_WALL_ASSETS.backgroundPlate}
        alt=""
        className="welcome-background-plate absolute inset-0 h-full w-full"
        decoding="async"
        draggable={false}
      />
      {!showFloorBand ? (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: WELCOME_FLOOR_BAND_HEIGHT,
            background: 'linear-gradient(to bottom, transparent 0%, rgb(5 8 6 / 0.92) 45%, #050806 100%)',
          }}
        />
      ) : null}
    </div>
  )
}
