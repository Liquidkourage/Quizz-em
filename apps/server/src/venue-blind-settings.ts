import fs from 'fs'
import path from 'path'
import { dataFile } from './data-dir'

export const VENUE_BLIND_SETTINGS_FILE = dataFile('venue-blind-settings.json')

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

/** A hand has started once the table leaves the lobby. Its blinds stay put until it returns. */
export function handBlindsAreLocked(phase: string | undefined): boolean {
  return phase != null && phase !== 'lobby'
}

/** Copy saved blinds onto a table. A hand already in progress keeps the blinds it started with. */
export function applyStoredBlinds<T extends { smallBlind: number; bigBlind: number; phase?: string }>(
  gs: T,
  next: { smallBlind: number; bigBlind: number },
): T {
  if (handBlindsAreLocked(gs.phase)) return gs
  if (gs.smallBlind === next.smallBlind && gs.bigBlind === next.bigBlind) return gs
  return { ...gs, smallBlind: next.smallBlind, bigBlind: next.bigBlind }
}

export function publishedTableBlinds(
  gs: { phase?: string; smallBlind: number; bigBlind: number },
  effective: { smallBlind: number; bigBlind: number; isTableOverride: boolean },
): { smallBlind: number; bigBlind: number; blindsTableOverride: boolean } {
  const locked = handBlindsAreLocked(gs.phase)
  const smallBlind = locked ? gs.smallBlind : effective.smallBlind
  const bigBlind = locked ? gs.bigBlind : effective.bigBlind
  const matchesOverride = smallBlind === effective.smallBlind && bigBlind === effective.bigBlind
  return {
    smallBlind,
    bigBlind,
    blindsTableOverride: effective.isTableOverride && matchesOverride,
  }
}

/** Venue strip: the hand in progress, or the saved blinds when every table is waiting. */
export function blindsShownForVenue(
  tables: readonly { phase: string; smallBlind: number; bigBlind: number }[],
  saved: { smallBlind: number; bigBlind: number },
): { smallBlind: number; bigBlind: number } {
  const live = tables.find((table) => handBlindsAreLocked(table.phase))
  if (live) return { smallBlind: live.smallBlind, bigBlind: live.bigBlind }
  return { smallBlind: saved.smallBlind, bigBlind: saved.bigBlind }
}

export function applyEffectiveBlindsToGameState<T extends { smallBlind: number; bigBlind: number; phase?: string }>(
  gs: T,
  venueCode: string,
  sessionKey: string,
): T {
  const b = effectiveBlindsForSessionKey(venueCode, sessionKey)
  return applyStoredBlinds(gs, b)
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

/** Pace-line save. A new ladder adopts that rung. A hands-only save keeps the live blinds. */
export function applyBlindScheduleSave(
  current: VenueBlindSettings,
  handsPerBlindLevel: number,
  replacementLevels?: BlindLevel[],
): VenueBlindSettings {
  const replaceLadder = replacementLevels != null && replacementLevels.length > 0
  const nextLevels = replaceLadder
    ? replacementLevels.map((level) => normalizeLevelPair(level.smallBlind, level.bigBlind))
    : current.levels
  const blindLevelIndex = Math.max(0, Math.min(nextLevels.length - 1, current.blindLevelIndex))
  const rung = levelFromIndex(nextLevels, blindLevelIndex)
  return {
    ...current,
    handsPerBlindLevel: clampHandsPerLevel(handsPerBlindLevel),
    levels: nextLevels,
    blindLevelIndex,
    smallBlind: replaceLadder ? rung.smallBlind : current.smallBlind,
    bigBlind: replaceLadder ? rung.bigBlind : current.bigBlind,
    handsAtCurrentLevel: replaceLadder ? 0 : current.handsAtCurrentLevel,
  }
}

/** One finished hand. Live blinds stay until the schedule actually changes level. */
export function advanceBlindLevel(current: VenueBlindSettings): {
  next: VenueBlindSettings
  leveledUp: boolean
} {
  let handsAtCurrentLevel = current.handsAtCurrentLevel + 1
  let blindLevelIndex = current.blindLevelIndex
  let leveledUp = false
  if (handsAtCurrentLevel >= current.handsPerBlindLevel && blindLevelIndex < current.levels.length - 1) {
    blindLevelIndex += 1
    handsAtCurrentLevel = 0
    leveledUp = true
  } else if (handsAtCurrentLevel >= current.handsPerBlindLevel) {
    handsAtCurrentLevel = current.handsPerBlindLevel
  }
  const rung = levelFromIndex(current.levels, blindLevelIndex)
  return {
    leveledUp,
    next: {
      ...current,
      blindLevelIndex,
      handsAtCurrentLevel,
      smallBlind: leveledUp ? rung.smallBlind : current.smallBlind,
      bigBlind: leveledUp ? rung.bigBlind : current.bigBlind,
    },
  }
}

export function setVenueBlindStructurePersist(
  venueCode: string,
  handsPerBlindLevel: number,
  levels?: BlindLevel[],
): VenueBlindSettings {
  const k = normalizeVenueKey(venueCode)
  const next = applyBlindScheduleSave(getVenueBlindSettings(k), handsPerBlindLevel, levels)
  venueSettings.set(k, next)
  persistToDisk()
  return { ...next, levels: next.levels.map((l) => ({ ...l })) }
}

/** A finished hand leaves the blinds alone. The host applies a pace suggestion. */
export function recordVenueHandCompleted(venueCode: string): string | null {
  normalizeVenueKey(venueCode)
  return null
}

export function venueBlindLevelSummary(venueCode: string): {
  levelNumber: number
  levelCount: number
  handsUntilNextLevel: number | null
} {
  const s = getVenueBlindSettings(venueCode)
  return {
    levelNumber: s.blindLevelIndex + 1,
    levelCount: s.levels.length,
    handsUntilNextLevel: null,
  }
}

const BLIND_NOTICE_MS = 12_000

type BlindChangeNotice = { smallBlind: number; bigBlind: number; atMs: number }

const shownBlindKey = new Map<string, string>()
const blindNotices = new Map<string, BlindChangeNotice>()

export function clearVenueBlindNotice(venueCode: string): void {
  const vn = normalizeVenueKey(venueCode)
  shownBlindKey.delete(vn)
  blindNotices.delete(vn)
}

/**
 * Remember the blinds the room is showing. A later pair is announced until the notice expires.
 * The announcement waits until a question has started, so Pay winners stays quiet.
 */
export function noteShownVenueBlinds(
  venueCode: string,
  smallBlind: number,
  bigBlind: number,
  now = Date.now(),
  handInProgress = false,
): BlindChangeNotice | null {
  const vn = normalizeVenueKey(venueCode)
  if (!handInProgress) {
    const waiting = blindNotices.get(vn)
    if (waiting == null || now - waiting.atMs >= BLIND_NOTICE_MS) return null
    return waiting
  }
  const key = `${smallBlind}/${bigBlind}`
  const prev = shownBlindKey.get(vn)
  shownBlindKey.set(vn, key)
  if (prev != null && prev !== key) {
    blindNotices.set(vn, { smallBlind, bigBlind, atMs: now })
  }
  const notice = blindNotices.get(vn)
  if (notice == null || now - notice.atMs >= BLIND_NOTICE_MS) return null
  return notice
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
