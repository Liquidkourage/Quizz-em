/** Join screen art — shared with display welcome wall plate + brackets. */
function joinPublicUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}join/${file}`
}

export const JOIN_SCREEN_ASSETS = {
  backgroundPlate: joinPublicUrl('welcome-background.png'),
  bracketCornerLeft: joinPublicUrl('bracket-corner-left.png'),
  bracketCornerRight: joinPublicUrl('bracket-corner-right.png'),
} as const
