import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { VENUE_SHUFFLE_EVERY_HANDS, resolveVenueShuffleTick } from '@qhe/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const VENUE_SHUFFLE_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'venue-shuffle-settings.json')

type StoreShape = Record<
  string,
  {
    handsCompletedAtVenue?: number
    shuffleEveryHands?: number
    skipNextShuffle?: boolean
    showStartedAtMs?: number
    fieldPeak?: number
  }
>

const SHUFFLE_EVERY_MIN = 1
const SHUFFLE_EVERY_MAX = 20

const handsCompletedByVenue = new Map<string, number>()
const shuffleEveryByVenue = new Map<string, number>()
const skipNextShuffleByVenue = new Map<string, boolean>()
const showStartedAtByVenue = new Map<string, number>()
const fieldPeakByVenue = new Map<string, number>()

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
    ...showStartedAtByVenue.keys(),
    ...fieldPeakByVenue.keys(),
  ])
  const obj: StoreShape = {}
  for (const vn of keys) {
    const started = showStartedAtByVenue.get(vn)
    obj[vn] = {
      handsCompletedAtVenue: handsCompletedByVenue.get(vn) ?? 0,
      shuffleEveryHands: shuffleEveryByVenue.get(vn) ?? VENUE_SHUFFLE_EVERY_HANDS,
      skipNextShuffle: skipNextShuffleByVenue.get(vn) === true,
      ...(started != null ? { showStartedAtMs: started } : {}),
      fieldPeak: fieldPeakByVenue.get(vn) ?? 0,
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

function rememberShowClock(vn: string, v: StoreShape[string]): void {
  const started = Number(v.showStartedAtMs)
  if (Number.isFinite(started) && started > 0) showStartedAtByVenue.set(vn, started)
  const peak = Math.floor(Number(v.fieldPeak))
  if (Number.isFinite(peak) && peak > 0) fieldPeakByVenue.set(vn, peak)
}

function loadOneVenue(key: string, raw: StoreShape[string] | undefined): void {
  const vn = normalizeVenueKey(key)
  if (!vn || !raw || typeof raw !== 'object') return
  const count = Math.max(0, Math.floor(Number(raw.handsCompletedAtVenue) || 0))
  handsCompletedByVenue.set(vn, count)
  if (raw.shuffleEveryHands != null) {
    shuffleEveryByVenue.set(vn, clampVenueShuffleEvery(raw.shuffleEveryHands))
  }
  if (raw.skipNextShuffle === true) skipNextShuffleByVenue.set(vn, true)
  rememberShowClock(vn, raw)
}

export function loadVenueShuffleSettingsFromDisk(): void {
  handsCompletedByVenue.clear()
  shuffleEveryByVenue.clear()
  skipNextShuffleByVenue.clear()
  showStartedAtByVenue.clear()
  fieldPeakByVenue.clear()
  try {
    const txt = fs.readFileSync(VENUE_SHUFFLE_SETTINGS_FILE, 'utf8')
    const obj = JSON.parse(txt) as StoreShape
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) loadOneVenue(k, v)
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
  showStartedAtByVenue.delete(vn)
  fieldPeakByVenue.delete(vn)
  persistToDisk()
}

/** First time a felt leaves the lobby. Later calls keep the original instant. */
export function noteVenueShowStarted(venueCode: string, nowMs = Date.now()): number | null {
  const vn = normalizeVenueKey(venueCode)
  if (!vn) return null
  const existing = showStartedAtByVenue.get(vn)
  if (existing != null) return existing
  const stamp = Math.floor(nowMs)
  showStartedAtByVenue.set(vn, stamp)
  persistToDisk()
  return stamp
}

export function getVenueShowStartedAt(venueCode: string): number | null {
  return showStartedAtByVenue.get(normalizeVenueKey(venueCode)) ?? null
}

/** Largest chip-survivor count seen since New game. */
export function noteVenueFieldPeak(venueCode: string, seen: number): number {
  const vn = normalizeVenueKey(venueCode)
  const n = Math.max(0, Math.floor(Number(seen)))
  const prev = fieldPeakByVenue.get(vn) ?? 0
  if (!vn || n <= prev) return prev
  fieldPeakByVenue.set(vn, n)
  persistToDisk()
  return n
}

export function getVenueFieldPeak(venueCode: string): number {
  return fieldPeakByVenue.get(normalizeVenueKey(venueCode)) ?? 0
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
