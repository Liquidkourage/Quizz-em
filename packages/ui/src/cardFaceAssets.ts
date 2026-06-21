/** Card-front viewBox aspect (500×700). */
export const CARD_FACE_ASPECT = 5 / 7

export type CardDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export function clampCardDigit(digit: number): CardDigit {
  const n = Math.floor(Number.isFinite(digit) ? digit : 0)
  if (n <= 0) return 0
  if (n >= 9) return 9
  return n as CardDigit
}
