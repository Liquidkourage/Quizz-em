/** Resolve a file from `public/welcome/` — must include Vite `base` (e.g. `/display/`). */
function welcomePublicUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}welcome/${file}`
}

/** Welcome wall art — official background plate + UI chrome. */
export const WELCOME_WALL_ASSETS = {
  /** Full viewport background (felt, suits, top arc, floor rail) — no foreground UI. */
  backgroundPlate: welcomePublicUrl('welcome-background.png'),
  /** Ornate top-corner bracket pair (left / right PNGs with alpha). */
  bracketCornerLeft: welcomePublicUrl('bracket-corner-left.png'),
  bracketCornerRight: welcomePublicUrl('bracket-corner-right.png'),
} as const
