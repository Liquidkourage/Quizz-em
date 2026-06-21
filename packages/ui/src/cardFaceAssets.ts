import cardFace0 from './assets/card-faces/digit-0.png'
import cardFace1 from './assets/card-faces/digit-1.png'
import cardFace2 from './assets/card-faces/digit-2.png'
import cardFace3 from './assets/card-faces/digit-3.png'
import cardFace4 from './assets/card-faces/digit-4.png'
import cardFace5 from './assets/card-faces/digit-5.png'
import cardFace6 from './assets/card-faces/digit-6.png'
import cardFace7 from './assets/card-faces/digit-7.png'
import cardFace8 from './assets/card-faces/digit-8.png'
import cardFace9 from './assets/card-faces/digit-9.png'

/** Card-front artwork for digits 0–9 (500×700 px, width:height = 5:7). */
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
