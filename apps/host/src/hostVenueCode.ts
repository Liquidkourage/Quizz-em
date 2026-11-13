export function readHostVenueCode(): string {
  if (typeof window === 'undefined') return 'HOST01'
  const fromUrl = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase()
  if (fromUrl) return fromUrl
  const fromEnv = import.meta.env.VITE_DEFAULT_VENUE_CODE as string | undefined
  if (fromEnv?.trim()) return fromEnv.trim().toUpperCase()
  try {
    const stored = localStorage.getItem('qhe-host-venue')
    if (stored?.trim()) return stored.trim().toUpperCase()
  } catch {
    /* ignore */
  }
  return 'HOST01'
}

export function persistHostVenueCode(code: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('qhe-host-venue', code.trim().toUpperCase())
  } catch {
    /* ignore */
  }
}

const ROOM_CODE = /^[A-Z0-9]{2,12}$/

/** A code players can type. Blank and the current code are not a change. */
export function roomCodeToApply(current: string, draft: string): string | null {
  const next = draft.trim().toUpperCase()
  if (!ROOM_CODE.test(next) || next === current.trim().toUpperCase()) return null
  return next
}

export function roomCodeHint(current: string, draft: string): string | null {
  const trimmed = draft.trim()
  if (!trimmed || roomCodeToApply(current, draft) || trimmed.toUpperCase() === current.trim().toUpperCase()) {
    return null
  }
  return 'Use 2 to 12 letters or numbers.'
}

/** Keep this code on the host address so a refresh opens the same room. */
export function venueUrlWithRoom(href: string, code: string): string {
  const url = new URL(href)
  url.searchParams.set('room', code)
  return url.toString()
}

export function rememberHostVenueCode(code: string): void {
  persistHostVenueCode(code)
  if (typeof window === 'undefined') return
  const next = venueUrlWithRoom(window.location.href, code)
  window.history.replaceState(window.history.state, '', next)
}
