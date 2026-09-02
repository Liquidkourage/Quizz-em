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
