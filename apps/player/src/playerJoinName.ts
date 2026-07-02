/** Compose venue-style display name from join form fields (e.g. Alice + C → Alice C.). */
export function composePlayerDisplayName(firstName: string, lastInitial: string): string {
  const first = firstName.trim()
  if (!first) return ''
  const initial = lastInitial.trim().replace(/\./g, '').charAt(0).toUpperCase()
  if (!initial) return first
  return `${first} ${initial}.`
}

/** Split a stored or URL name into join-form fields. */
export function parsePlayerDisplayName(fullName: string): { firstName: string; lastInitial: string } {
  const t = fullName.trim()
  if (!t) return { firstName: '', lastInitial: '' }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastInitial: '' }
  const first = parts[0]!
  const lastToken = parts[parts.length - 1]!
  const initial = lastToken.replace(/\./g, '').charAt(0).toUpperCase()
  return { firstName: first, lastInitial: initial }
}

export function sanitizeLastInitialInput(raw: string): string {
  const letter = raw.replace(/[^a-zA-Z]/g, '').charAt(0)
  return letter ? letter.toUpperCase() : ''
}
