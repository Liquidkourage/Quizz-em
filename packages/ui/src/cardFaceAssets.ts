import cardFace0 from './assets/card-faces/digit-0.svg'
import cardFace1 from './assets/card-faces/digit-1.svg'
import cardFace2 from './assets/card-faces/digit-2.svg'
import cardFace3 from './assets/card-faces/digit-3.svg'
import cardFace4 from './assets/card-faces/digit-4.svg'
import cardFace5 from './assets/card-faces/digit-5.svg'
import cardFace6 from './assets/card-faces/digit-6.svg'
import cardFace7 from './assets/card-faces/digit-7.svg'
import cardFace8 from './assets/card-faces/digit-8.svg'
import cardFace9 from './assets/card-faces/digit-9.svg'

/** Official digit card fronts (500×700 SVG, 5:7) — user-supplied artwork. */
export const CARD_FACE_IMAGE_SRCS = [
  cardFace0,
  cardFace1,
  cardFace2,
  cardFace3,
  cardFace4,
  cardFace5,
  cardFace6,
  cardFace7,
  cardFace8,
  cardFace9,
] as const

/** Card-front viewBox aspect (500×700). */
export const CARD_FACE_ASPECT = 5 / 7

export type CardDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export function clampCardDigit(digit: number): CardDigit {
  const n = Math.floor(Number.isFinite(digit) ? digit : 0)
  if (n <= 0) return 0
  if (n >= 9) return 9
  return n as CardDigit
}

export function cardFaceImageSrc(digit: number): string {
  return CARD_FACE_IMAGE_SRCS[clampCardDigit(digit)]
}
