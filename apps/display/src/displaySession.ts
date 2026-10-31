const DISPLAY_VENUE_STORAGE_KEY = 'qhe-display-venue'
const DISPLAY_SCREEN_STORAGE_KEY = 'qhe-display-screen'
const SCREEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeDisplayVenue(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toUpperCase() ?? ''
  if (!trimmed || trimmed === 'PAIRING') return null
  return trimmed
}

/** A room in the address wins. Otherwise a saved pairing resumes. Otherwise the TV waits for a code. */
export function displayVenueOnBoot(
  urlRoom: string | null | undefined,
  savedVenue: string | null | undefined,
): string | null {
  return normalizeDisplayVenue(urlRoom) ?? normalizeDisplayVenue(savedVenue)
}

export function mintDisplayScreenCode(randomByte: () => number = () => Math.floor(Math.random() * 32)): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += SCREEN_ALPHABET[Math.abs(randomByte()) % SCREEN_ALPHABET.length]!
  }
  return code
}

export function readSavedDisplayVenue(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return normalizeDisplayVenue(localStorage.getItem(DISPLAY_VENUE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function persistDisplayVenue(venue: string): void {
  const next = normalizeDisplayVenue(venue)
  if (!next || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DISPLAY_VENUE_STORAGE_KEY, next)
  } catch {
    /* private mode */
  }
}

export function clearSavedDisplayVenue(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(DISPLAY_VENUE_STORAGE_KEY)
  } catch {
    /* private mode */
  }
}

/** Stable per browser so the host can tell two TVs apart after a refresh. */
export function readOrCreateDisplayScreenCode(): string {
  if (typeof localStorage === 'undefined') return mintDisplayScreenCode()
  try {
    const existing = localStorage.getItem(DISPLAY_SCREEN_STORAGE_KEY)?.trim().toUpperCase() ?? ''
    if (/^[A-Z2-9]{4}$/.test(existing)) return existing
    const next = mintDisplayScreenCode()
    localStorage.setItem(DISPLAY_SCREEN_STORAGE_KEY, next)
    return next
  } catch {
    return mintDisplayScreenCode()
  }
}

export function displayScreenLabel(): string {
  return `Quizz'em TV ${readOrCreateDisplayScreenCode()}`
}

/** Drop a bookmarked room so a released TV stays on the pairing screen after refresh. */
export function stripDisplayVenueFromAddress(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  url.searchParams.delete('table')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, '', next)
}
