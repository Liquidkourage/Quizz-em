/** Resolve a file from `public/welcome/` — must include Vite `base` (e.g. `/display/`). */
function welcomePublicUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}welcome/${file}`
}

/** Welcome wall art — image layers from the TV mockup + generated isolates. */
export const WELCOME_WALL_ASSETS = {
  /** Purple/emerald felt with embossed suits (generated to match mockup). */
  feltBg: welcomePublicUrl('felt-bg.jpg'),
  /** Polished floor strip — procedural wood + gold horizon (no mockup UI ghosts). */
  floorReflection: welcomePublicUrl('floor-reflection.jpg'),
  /** Mockup-style L-bracket with marquee bulbs (simple, not baroque). */
  bracketCorner: welcomePublicUrl('bracket-corner.png'),
} as const
