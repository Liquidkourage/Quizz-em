function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

/** Later seats that share a display name gain a number: "Alice C." then "Alice C. 2". */
export function disambiguatePublicNames(names: readonly string[]): string[] {
  const counts = new Map<string, number>()
  for (const name of names) {
    const key = nameKey(name)
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const seen = new Map<string, number>()
  return names.map((name) => {
    const key = nameKey(name)
    if (!key || (counts.get(key) ?? 0) < 2) return name
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    if (n === 1) return name
    return `${name.trim()} ${n}`
  })
}

/**
 * First "Chris L." stays. The next phone with that same name becomes "Chris L. 2".
 * Comparison ignores case and surrounding spaces. A different spelling is left alone.
 */
export function uniquePublicDisplayName(requested: string, taken: readonly string[]): string {
  const base = requested.trim()
  if (!base) return ''
  const baseKey = base.toLowerCase()
  const prefix = `${baseKey} `
  const used = new Set<number>()
  for (const raw of taken) {
    const key = raw.trim().toLowerCase()
    if (!key) continue
    if (key === baseKey) {
      used.add(1)
      continue
    }
    if (!key.startsWith(prefix)) continue
    const tail = key.slice(prefix.length)
    if (/^\d+$/.test(tail)) used.add(Number(tail))
  }
  if (!used.has(1)) return base
  let n = 2
  while (used.has(n)) n += 1
  return `${base} ${n}`
}

/** Two-letter seat mark. A numbered "Alice C. 2" becomes A2. */
export function publicSeatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const tail = parts[parts.length - 1] ?? ''
  if (parts.length > 1 && /^\d+$/.test(tail)) {
    const letter = (parts[0]?.[0] ?? '').toUpperCase()
    return `${letter}${tail}`.slice(0, 2)
  }
  return parts
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
