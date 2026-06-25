/** Resolve a file from `public/welcome/` — must include Vite `base` (e.g. `/display/`). */
function welcomePublicUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}welcome/${file}`
}

/** Welcome wall art — image layers from the TV mockup + generated isolates. */
export const WELCOME_WALL_ASSETS = {
  /** Purple/emerald felt with embossed suits (generated to match mockup). */
  feltBg: welcomePublicUrl('felt-bg.jpg'),
  /** Polished floor + gold bounce (from mockup bottom strip). */
  floorReflection: welcomePublicUrl('floor-reflection-mockup.jpg'),
  /** Ornate gold corner bracket (generated isolate, alpha PNG). */
  bracketCorner: welcomePublicUrl('bracket-corner.png'),
} as const
