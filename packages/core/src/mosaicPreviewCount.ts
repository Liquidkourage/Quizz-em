import { VENUE_NUMBERED_TABLE_MAX } from './venueConstants'

/**
 * Cosmetic TV mosaic size.
 * `null` clears it. `undefined` is not a count the wall can show.
 */
export function parseMosaicPreviewCount(raw: unknown): number | null | undefined {
  if (raw === null) return null
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return undefined
  if (raw < 1 || raw > VENUE_NUMBERED_TABLE_MAX) return undefined
  return raw
}
