import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { VENUE_SHUFFLE_EVERY_HANDS, resolveVenueShuffleTick } from '@qhe/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const VENUE_SHUFFLE_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'venue-shuffle-settings.json')

type StoreShape = Record<
  string,
  { handsCompletedAtVenue?: number; shuffleEveryHands?: number; skipNextShuffle?: boolean }
>

const SHUFFLE_EVERY_MIN = 1
const SHUFFLE_EVERY_MAX = 20

const handsCompletedByVenue = new Map<string, number>()
const shuffleEveryByVenue = new Map<string, number>()
const skipNextShuffleByVenue = new Map<string, boolean>()

export function clampVenueShuffleEvery(raw: unknown): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return VENUE_SHUFFLE_EVERY_HANDS
  return Math.min(SHUFFLE_EVERY_MAX, Math.max(SHUFFLE_EVERY_MIN, n))
}

function normalizeVenueKey(venue: string): string {
  return String(venue ?? '')
    .trim()
    .toUpperCase()
}

function persistToDisk(): void {
  const keys = new Set<string>([
    ...handsCompletedByVenue.keys(),
    ...shuffleEveryByVenue.keys(),
    ...skipNextShuffleByVenue.keys(),
  ])
  const obj: StoreShape = {}
  for (const vn of keys) {
    obj[vn] = {
      handsCompletedAtVenue: handsCompletedByVenue.get(vn) ?? 0,
      shuffleEveryHands: shuffleEveryByVenue.get(vn) ?? VENUE_SHUFFLE_EVERY_HANDS,
      skipNextShuffle: skipNextShuffleByVenue.get(vn) === true,
    }
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
  shuffleEveryByVenue.clear()
  skipNextShuffleByVenue.clear()
  try {
    const txt = fs.readFileSync(VENUE_SHUFFLE_SETTINGS_FILE, 'utf8')
    const obj = JSON.parse(txt) as StoreShape
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      const vn = normalizeVenueKey(k)
      if (!vn || !v || typeof v !== 'object') continue
      const count = Math.max(0, Math.floor(Number(v.handsCompletedAtVenue) || 0))
      handsCompletedByVenue.set(vn, count)
      if (v.shuffleEveryHands != null) {
        shuffleEveryByVenue.set(vn, clampVenueShuffleEvery(v.shuffleEveryHands))
      }
      if (v.skipNextShuffle === true) skipNextShuffleByVenue.set(vn, true)
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
  skipNextShuffleByVenue.set(vn, false)
  persistToDisk()
}

export function getVenueShuffleEvery(venueCode: string): number {
  return shuffleEveryByVenue.get(normalizeVenueKey(venueCode)) ?? VENUE_SHUFFLE_EVERY_HANDS
}

export function isVenueShuffleHeld(venueCode: string): boolean {
  return skipNextShuffleByVenue.get(normalizeVenueKey(venueCode)) === true
}

export function setVenueShuffleEvery(venueCode: string, every: unknown): number {
  const vn = normalizeVenueKey(venueCode)
  const next = clampVenueShuffleEvery(every)
  shuffleEveryByVenue.set(vn, next)
  persistToDisk()
  return next
}

export function setVenueSkipNextShuffle(venueCode: string, skip: boolean): boolean {
  const vn = normalizeVenueKey(venueCode)
  skipNextShuffleByVenue.set(vn, skip === true)
  persistToDisk()
  return skip === true
}

/** After a host shuffle-now, the next cycle starts clean and a pending skip is cleared. */
export function alignVenueShuffleCounterAfterManualShuffle(venueCode: string): void {
  const vn = normalizeVenueKey(venueCode)
  const every = getVenueShuffleEvery(vn)
  const done = getVenueHandsCompleted(vn)
  const mod = done % every
  if (mod !== 0) handsCompletedByVenue.set(vn, done + (every - mod))
  skipNextShuffleByVenue.set(vn, false)
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
  const tick = resolveVenueShuffleTick({
    handsCompletedAtVenue,
    every: getVenueShuffleEvery(vn),
    skipNext: isVenueShuffleHeld(vn),
  })
  skipNextShuffleByVenue.set(vn, tick.skipNext)
  persistToDisk()
  return {
    handsCompletedAtVenue,
    shuffleThisRound: tick.shuffleThisRound,
    handsUntilShuffle: tick.handsUntilShuffle,
  }
}

export function venueShuffleSummary(venueCode: string): {
  handsCompletedAtVenue: number
  handsUntilShuffle: number
  shuffleEveryHands: number
} {
  const vn = normalizeVenueKey(venueCode)
  const handsCompletedAtVenue = getVenueHandsCompleted(vn)
  const every = getVenueShuffleEvery(vn)
  const tick = resolveVenueShuffleTick({
    handsCompletedAtVenue,
    every,
    skipNext: isVenueShuffleHeld(vn),
  })
  return {
    handsCompletedAtVenue,
    handsUntilShuffle: tick.handsUntilShuffle + (isVenueShuffleHeld(vn) ? every : 0),
    shuffleEveryHands: every,
  }
}
