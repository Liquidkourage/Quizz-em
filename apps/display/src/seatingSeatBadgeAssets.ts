import seatBadge1 from './assets/seat-badge-1.svg'
import seatBadge2 from './assets/seat-badge-2.svg'
import seatBadge3 from './assets/seat-badge-3.svg'
import seatBadge4 from './assets/seat-badge-4.svg'
import seatBadge5 from './assets/seat-badge-5.svg'
import seatBadge6 from './assets/seat-badge-6.svg'
import seatBadge7 from './assets/seat-badge-7.svg'
import seatBadge8 from './assets/seat-badge-8.svg'

/** Gold seat-badge SVGs (seats 1–8) for map markers and roster rows. */
export const SEATING_SEAT_BADGE_SRC: Record<number, string> = {
  1: seatBadge1,
  2: seatBadge2,
  3: seatBadge3,
  4: seatBadge4,
  5: seatBadge5,
  6: seatBadge6,
  7: seatBadge7,
  8: seatBadge8,
}

export function seatingSeatBadgeSrc(seatNum: number): string | null {
  const n = Math.floor(seatNum)
  return SEATING_SEAT_BADGE_SRC[n] ?? null
}
