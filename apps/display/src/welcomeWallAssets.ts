/** Resolve a file from `public/welcome/` — must include Vite `base` (e.g. `/display/`). */
function welcomePublicUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}welcome/${file}`
}

/** Welcome wall art — layers extracted from welcome-wall-tv-mockup.png. */
export const WELCOME_WALL_ASSETS = {
  /** Purple/emerald felt with embossed club/diamond suits. */
  feltBg: welcomePublicUrl('felt-bg.jpg'),
  /** Polished floor + column reflections (mockup bottom band). */
  floorReflection: welcomePublicUrl('floor-reflection.png'),
  /** L-bracket with marquee bulbs (mockup top-left panel corner). */
  bracketCorner: welcomePublicUrl('bracket-corner.png'),
} as const
