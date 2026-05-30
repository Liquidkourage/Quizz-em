import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const VENUE_BLIND_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'venue-blind-settings.json')

export const DEFAULT_BLIND_LEVELS: ReadonlyArray<readonly [number, number]> = [
  [10, 20],
  [15, 30],
  [25, 50],
  [50, 100],
  [75, 150],
  [100, 200],
]

export const DEFAULT_HANDS_PER_BLIND_LEVEL = 3
export const BLIND_MIN = 1
export const BLIND_MAX = 1_000_000
export const HANDS_PER_LEVEL_MIN = 1
export const HANDS_PER_LEVEL_MAX = 50

export type BlindLevel = { smallBlind: number; bigBlind: number }

export type VenueBlindSettings = {
  smallBlind: number
  bigBlind: number
  blindLevelIndex: number
  handsPerBlindLevel: number
  handsAtCurrentLevel: number
  levels: BlindLevel[]
}

type StoreShape = Record<
  string,
  {
    smallBlind?: number
    bigBlind?: number
    blindLevelIndex?: number
    handsPerBlindLevel?: number
    handsAtCurrentLevel?: number
    levels?: Array<{ smallBlind?: number; bigBlind?: number }>
    tableOverrides?: Record<string, { smallBlind?: number; bigBlind?: number }>
  }
>

const venueSettings = new Map<string, VenueBlindSettings>()
/** sessionKey → override blinds (table-specific) */
const tableOverrides = new Map<string, { smallBlind: number; bigBlind: number }>()

function normalizeVenueKey(venue: string): string {
  return String(venue ?? '')
    .trim()
    .toUpperCase()
}

function clampBlind(n: number): number {
  const x = Math.floor(Number(n))
  if (!Number.isFinite(x)) return DEFAULT_BLIND_LEVELS[0]![0]!
  return Math.min(BLIND_MAX, Math.max(BLIND_MIN, x))
}

function normalizeLevelPair(sbRaw: number, bbRaw: number): BlindLevel {
  const sb = clampBlind(sbRaw)
  const bb = clampBlind(bbRaw)
  return { smallBlind: sb, bigBlind: Math.max(sb, bb) }
}

function defaultLevels(): BlindLevel[] {
  return DEFAULT_BLIND_LEVELS.map(([sb, bb]) => normalizeLevelPair(sb, bb))
}

function levelFromIndex(levels: BlindLevel[], index: number): BlindLevel {
  if (levels.length === 0) return normalizeLevelPair(10, 20)
  const i = Math.max(0, Math.min(levels.length - 1, Math.floor(index)))
  return levels[i]!
}

function clampHandsPerLevel(n: number): number {
  const x = Math.floor(Number(n))
  if (!Number.isFinite(x)) return DEFAULT_HANDS_PER_BLIND_LEVEL
  return Math.min(HANDS_PER_LEVEL_MAX, Math.max(HANDS_PER_LEVEL_MIN, x))
}

function defaultVenueSettings(): VenueBlindSettings {
  const levels = defaultLevels()
  const lv = levelFromIndex(levels, 0)
  return {
    smallBlind: lv.smallBlind,
    bigBlind: lv.bigBlind,
    blindLevelIndex: 0,
    handsPerBlindLevel: DEFAULT_HANDS_PER_BLIND_LEVEL,
    handsAtCurrentLevel: 0,
    levels,
  }
}

function persistToDisk(): void {
  const obj: StoreShape = {}
  for (const [vn, s] of venueSettings) {
    const overrides: Record<string, { smallBlind: number; bigBlind: number }> = {}
    for (const [sk, o] of tableOverrides) {
      if (!sk.startsWith(`${vn}:`)) continue
      const tableId = sk.slice(vn.length + 1)
      overrides[tableId] = o
    }
    obj[vn] = {
      smallBlind: s.smallBlind,
      bigBlind: s.bigBlind,
      blindLevelIndex: s.blindLevelIndex,
      handsPerBlindLevel: s.handsPerBlindLevel,
      handsAtCurrentLevel: s.handsAtCurrentLevel,
      levels: s.levels.map((l) => ({ ...l })),
      ...(Object.keys(overrides).length > 0 ? { tableOverrides: overrides } : {}),
    }
  }
  const dir = path.dirname(VENUE_BLIND_SETTINGS_FILE)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(VENUE_BLIND_SETTINGS_FILE, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
  } catch (e) {
    console.error('Failed to persist venue blind settings:', e)
  }
}

export function loadVenueBlindSettingsFromDisk(): void {
  venueSettings.clear()
  tableOverrides.clear()
  try {
    const txt = fs.readFileSync(VENUE_BLIND_SETTINGS_FILE, 'utf8')
    const obj = JSON.parse(txt) as StoreShape
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      const vn = normalizeVenueKey(k)
      if (!vn || !v || typeof v !== 'object') continue
      const levels =
        Array.isArray(v.levels) && v.levels.length > 0
          ? v.levels.map((l) => normalizeLevelPair(l?.smallBlind ?? 10, l?.bigBlind ?? 20))
          : defaultLevels()
      const blindLevelIndex = Math.max(
        0,
        Math.min(levels.length - 1, Math.floor(Number(v.blindLevelIndex) || 0)),
      )
      const lv = levelFromIndex(levels, blindLevelIndex)
      const sb =
        typeof v.smallBlind === 'number' && Number.isFinite(v.smallBlind)
          ? clampBlind(v.smallBlind)
          : lv.smallBlind
      const bb =
        typeof v.bigBlind === 'number' && Number.isFinite(v.bigBlind)
          ? clampBlind(v.bigBlind)
          : lv.bigBlind
      venueSettings.set(vn, {
        smallBlind: sb,
        bigBlind: Math.max(sb, bb),
        blindLevelIndex,
        handsPerBlindLevel: clampHandsPerLevel(v.handsPerBlindLevel ?? DEFAULT_HANDS_PER_BLIND_LEVEL),
        handsAtCurrentLevel: Math.max(0, Math.floor(Number(v.handsAtCurrentLevel) || 0)),
        levels,
      })
      if (v.tableOverrides && typeof v.tableOverrides === 'object') {
        for (const [tableId, o] of Object.entries(v.tableOverrides)) {
          if (!o || typeof o !== 'object') continue
          const pair = normalizeLevelPair(o.smallBlind ?? sb, o.bigBlind ?? bb)
          tableOverrides.set(`${vn}:${tableId}`, pair)
        }
      }
    }
  } catch {
    /* missing file is fine */
  }
}

export function getVenueBlindSettings(venueCode: string): VenueBlindSettings {
  const k = normalizeVenueKey(venueCode)
  const existing = venueSettings.get(k)
  if (existing) return { ...existing, levels: existing.levels.map((l) => ({ ...l })) }
  const d = defaultVenueSettings()
  venueSettings.set(k, d)
  return { ...d, levels: d.levels.map((l) => ({ ...l })) }
}

export function effectiveBlindsForSessionKey(
  venueCode: string,
  sessionKey: string,
): { smallBlind: number; bigBlind: number; isTableOverride: boolean } {
  const override = tableOverrides.get(sessionKey)
  if (override) {
    return { ...override, isTableOverride: true }
  }
  const v = getVenueBlindSettings(venueCode)
  return { smallBlind: v.smallBlind, bigBlind: v.bigBlind, isTableOverride: false }
}

export function applyEffectiveBlindsToGameState<T extends { smallBlind: number; bigBlind: number }>(
  gs: T,
  venueCode: string,
  sessionKey: string,
): T {
  const b = effectiveBlindsForSessionKey(venueCode, sessionKey)
  return { ...gs, smallBlind: b.smallBlind, bigBlind: b.bigBlind }
}

/** Venue-wide manual set — clears per-table overrides for this venue. */
export function setVenueBlindsPersist(
  venueCode: string,
  smallBlind: number,
  bigBlind: number,
): VenueBlindSettings {
  const k = normalizeVenueKey(venueCode)
  const pair = normalizeLevelPair(smallBlind, bigBlind)
  const cur = getVenueBlindSettings(k)
  const next: VenueBlindSettings = {
    ...cur,
    smallBlind: pair.smallBlind,
    bigBlind: pair.bigBlind,
  }
  venueSettings.set(k, next)
  for (const sk of [...tableOverrides.keys()]) {
    if (sk.startsWith(`${k}:`)) tableOverrides.delete(sk)
  }
  persistToDisk()
  return { ...next, levels: next.levels.map((l) => ({ ...l })) }
}

export function setTableBlindsOverride(
  venueCode: string,
  tableId: string,
  smallBlind: number,
  bigBlind: number,
): { smallBlind: number; bigBlind: number } {
  const vn = normalizeVenueKey(venueCode)
  const tid = String(tableId ?? '').trim()
  const pair = normalizeLevelPair(smallBlind, bigBlind)
  tableOverrides.set(`${vn}:${tid}`, pair)
  persistToDisk()
  return pair
}

export function clearTableBlindsOverride(venueCode: string, tableId: string): void {
  const vn = normalizeVenueKey(venueCode)
  const tid = String(tableId ?? '').trim()
  tableOverrides.delete(`${vn}:${tid}`)
  persistToDisk()
}

export function setVenueBlindStructurePersist(
  venueCode: string,
  handsPerBlindLevel: number,
  levels?: BlindLevel[],
): VenueBlindSettings {
  const k = normalizeVenueKey(venueCode)
  const cur = getVenueBlindSettings(k)
  const nextLevels =
    levels != null && levels.length > 0
      ? levels.map((l) => normalizeLevelPair(l.smallBlind, l.bigBlind))
      : cur.levels
  const idx = Math.max(0, Math.min(nextLevels.length - 1, cur.blindLevelIndex))
  const lv = levelFromIndex(nextLevels, idx)
  const next: VenueBlindSettings = {
    ...cur,
    handsPerBlindLevel: clampHandsPerLevel(handsPerBlindLevel),
    levels: nextLevels,
    blindLevelIndex: idx,
    smallBlind: lv.smallBlind,
    bigBlind: lv.bigBlind,
    handsAtCurrentLevel: 0,
  }
  venueSettings.set(k, next)
  persistToDisk()
  return { ...next, levels: next.levels.map((l) => ({ ...l })) }
}

/** After a venue-wide hand completes — returns toast message when level increases. */
export function recordVenueHandCompleted(venueCode: string): string | null {
  const k = normalizeVenueKey(venueCode)
  const cur = getVenueBlindSettings(k)
  let handsAtCurrentLevel = cur.handsAtCurrentLevel + 1
  let blindLevelIndex = cur.blindLevelIndex
  let leveledUp = false

  if (handsAtCurrentLevel >= cur.handsPerBlindLevel && blindLevelIndex < cur.levels.length - 1) {
    blindLevelIndex += 1
    handsAtCurrentLevel = 0
    leveledUp = true
  } else if (handsAtCurrentLevel >= cur.handsPerBlindLevel) {
    handsAtCurrentLevel = cur.handsPerBlindLevel
  }

  const lv = levelFromIndex(cur.levels, blindLevelIndex)
  const next: VenueBlindSettings = {
    ...cur,
    blindLevelIndex,
    handsAtCurrentLevel,
    smallBlind: lv.smallBlind,
    bigBlind: lv.bigBlind,
  }
  venueSettings.set(k, next)
  persistToDisk()

  if (!leveledUp) return null
  return `Blinds increased — level ${blindLevelIndex + 1}: $${lv.smallBlind} / $${lv.bigBlind}`
}

export function venueBlindLevelSummary(venueCode: string): {
  levelNumber: number
  levelCount: number
  handsUntilNextLevel: number | null
} {
  const s = getVenueBlindSettings(venueCode)
  const atMax = s.blindLevelIndex >= s.levels.length - 1
  const handsUntilNextLevel = atMax
    ? null
    : Math.max(0, s.handsPerBlindLevel - s.handsAtCurrentLevel)
  return {
    levelNumber: s.blindLevelIndex + 1,
    levelCount: s.levels.length,
    handsUntilNextLevel,
  }
}

export function hostLibraryBlindsPayload(venueCode: string) {
  const s = getVenueBlindSettings(venueCode)
  const sum = venueBlindLevelSummary(venueCode)
  return {
    smallBlind: s.smallBlind,
    bigBlind: s.bigBlind,
    blindLevelIndex: s.blindLevelIndex,
    blindLevelCount: s.levels.length,
    handsPerBlindLevel: s.handsPerBlindLevel,
    handsAtCurrentLevel: s.handsAtCurrentLevel,
    handsUntilNextLevel: sum.handsUntilNextLevel,
    levels: s.levels.map((l) => ({ ...l })),
  }
}
