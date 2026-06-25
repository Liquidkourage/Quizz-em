/** Resolve a file from `public/welcome/` — must include Vite `base` (e.g. `/display/`). */
function welcomePublicUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}welcome/${file}`
}

/** Welcome wall art — official background plate + UI chrome. */
export const WELCOME_WALL_ASSETS = {
  /** Full viewport background (felt, suits, top arc, floor) — no foreground UI. */
  backgroundPlate: welcomePublicUrl('welcome-background.png'),
  /** Polished floor + column reflections under the panel row. */
  floorReflection: welcomePublicUrl('floor-reflection.png'),
  /** L-bracket with marquee bulbs (mockup top-left panel corner). */
  bracketCorner: welcomePublicUrl('bracket-corner.png'),
} as const
