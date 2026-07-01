import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { VENUE_SHUFFLE_EVERY_HANDS, handsUntilVenueShuffle, isVenueShuffleHand } from '@qhe/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const VENUE_SHUFFLE_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'venue-shuffle-settings.json')

type StoreShape = Record<string, { handsCompletedAtVenue?: number }>

const handsCompletedByVenue = new Map<string, number>()

function normalizeVenueKey(venue: string): string {
  return String(venue ?? '')
    .trim()
    .toUpperCase()
}

function persistToDisk(): void {
  const obj: StoreShape = {}
  for (const [vn, count] of handsCompletedByVenue) {
    obj[vn] = { handsCompletedAtVenue: count }
  }
  const dir = path.dirname(VENUE_SHUFFLE_SETTINGS_FILE)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(VENUE_SHUFFLE_SETTINGS_FILE, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
  } catch (e) {
    console.error('Failed to persist venue shuffle settings:', e)
  }
}

export function loadVenueShuffleSettingsFromDisk(): void {
  handsCompletedByVenue.clear()
  try {
    const txt = fs.readFileSync(VENUE_SHUFFLE_SETTINGS_FILE, 'utf8')
    const obj = JSON.parse(txt) as StoreShape
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      const vn = normalizeVenueKey(k)
      if (!vn || !v || typeof v !== 'object') continue
      const count = Math.max(0, Math.floor(Number(v.handsCompletedAtVenue) || 0))
      handsCompletedByVenue.set(vn, count)
    }
  } catch {
    /* missing file on first boot */
  }
}

export function getVenueHandsCompleted(venueCode: string): number {
  const vn = normalizeVenueKey(venueCode)
  return handsCompletedByVenue.get(vn) ?? 0
}

export function resetVenueShuffleCounter(venueCode: string): void {
  const vn = normalizeVenueKey(venueCode)
  handsCompletedByVenue.set(vn, 0)
  persistToDisk()
}

/** After a venue-wide End Round — returns whether this hand triggers a table shuffle. */
export function recordVenueShuffleHandCompleted(venueCode: string): {
  handsCompletedAtVenue: number
  shuffleThisRound: boolean
  handsUntilShuffle: number
} {
  const vn = normalizeVenueKey(venueCode)
  const handsCompletedAtVenue = getVenueHandsCompleted(vn) + 1
  handsCompletedByVenue.set(vn, handsCompletedAtVenue)
  persistToDisk()
  const shuffleThisRound = isVenueShuffleHand(handsCompletedAtVenue, VENUE_SHUFFLE_EVERY_HANDS)
  return {
    handsCompletedAtVenue,
    shuffleThisRound,
    handsUntilShuffle: handsUntilVenueShuffle(handsCompletedAtVenue, VENUE_SHUFFLE_EVERY_HANDS),
  }
}

export function venueShuffleSummary(venueCode: string): {
  handsCompletedAtVenue: number
  handsUntilShuffle: number
  shuffleEveryHands: number
} {
  const handsCompletedAtVenue = getVenueHandsCompleted(venueCode)
  return {
    handsCompletedAtVenue,
    handsUntilShuffle: handsUntilVenueShuffle(handsCompletedAtVenue, VENUE_SHUFFLE_EVERY_HANDS),
    shuffleEveryHands: VENUE_SHUFFLE_EVERY_HANDS,
  }
}
