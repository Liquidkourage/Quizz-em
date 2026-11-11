import fs from 'fs'
import type { Question, Setlist } from '@qhe/core'
import { dataFile } from './data-dir'

/** v2: per-venue questions + setlists */
export const VENUE_LIBRARIES_FILE = dataFile('venue-libraries.json')
/** v1: migrate if v2 missing */
export const LEGACY_QUESTION_BANKS_FILE = dataFile('question-banks.json')

export interface VenueLibraryData {
  questions: Question[]
  setlists: Setlist[]
}

function normalizeImportedQuestion(normVenuePrefix: string, q: unknown, index: number): Question | null {
  if (!q || typeof q !== 'object') return null
  const o = q as Record<string, unknown>
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  const answer = Number(o.answer)
  if (!text || Number.isNaN(answer)) return null
  let id =
    typeof o.id === 'string' && o.id.trim().length > 0 ? o.id.trim() : ''
  if (!id) id = `imp-${normVenuePrefix}-${index}-${Date.now().toString(36)}`
  let category: string | undefined
  if (typeof o.category === 'string' && o.category.trim()) category = o.category.trim()
  let difficulty: number | undefined
  const d = Number(o.difficulty)
  if (!Number.isNaN(d) && d >= 1 && d <= 5) difficulty = d
  return { id, text, answer, category, difficulty }
}

function parseSetlistLoose(raw: unknown): Setlist | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!id || !name) return null
  const questionIds = Array.isArray(o.questionIds)
    ? o.questionIds
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    : []
  return { id, name, questionIds }
}

function ingestRootObject(map: Map<string, VenueLibraryData>, obj: Record<string, unknown>) {
  for (const [key, val] of Object.entries(obj)) {
    const norm = key.trim().toUpperCase()
    if (Array.isArray(val)) {
      const questions: Question[] = []
      for (let i = 0; i < val.length; i++) {
        const q = normalizeImportedQuestion(norm, val[i], i)
        if (q) questions.push(q)
      }
      if (questions.length > 0 || map.has(norm)) {
        const prev = map.get(norm) ?? { questions: [], setlists: [] }
        map.set(norm, { questions, setlists: prev.setlists })
      }
      continue
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const v = val as Record<string, unknown>
      const qRaw = v.questions
      const sRaw = v.setlists
      const questions: Question[] = []
      if (Array.isArray(qRaw)) {
        for (let i = 0; i < qRaw.length; i++) {
          const q = normalizeImportedQuestion(norm, qRaw[i], i)
          if (q) questions.push(q)
        }
      }
      const setlists: Setlist[] = []
      if (Array.isArray(sRaw)) {
        for (const row of sRaw) {
          const sl = parseSetlistLoose(row)
          if (sl) setlists.push(sl)
        }
      }
      map.set(norm, { questions, setlists })
    }
  }
}

/** One-time SQLite migration — banks now live in `venue-libraries.sqlite` (see venue-library-db). */
export function loadVenueLibrariesFromJsonDisk(): Map<string, VenueLibraryData> {
  const map = new Map<string, VenueLibraryData>()
  try {
    const txt = fs.readFileSync(VENUE_LIBRARIES_FILE, 'utf8')
    const obj = JSON.parse(txt) as Record<string, unknown>
    if (obj && typeof obj === 'object') ingestRootObject(map, obj)
    return map
  } catch {
    try {
      const txt = fs.readFileSync(LEGACY_QUESTION_BANKS_FILE, 'utf8')
      const obj = JSON.parse(txt) as Record<string, unknown>
      if (obj && typeof obj === 'object') ingestRootObject(map, obj)
      return map
    } catch {
      return map
    }
  }
}

export function coerceImportQuestions(normVenue: string, rows: unknown[]): Question[] {
  const validated: Question[] = []
  for (let i = 0; i < rows.length; i++) {
    const q = normalizeImportedQuestion(normVenue, rows[i], i)
    if (q) validated.push(q)
  }
  return validated
}

/** Remove ids not present in this bank. Ids still known in another room stay on a shared playlist. */
export function pruneSetlistRefs(lib: VenueLibraryData, alsoKnown?: Iterable<string>): void {
  const ids = new Set(lib.questions.map((q) => q.id))
  if (alsoKnown) {
    for (const id of alsoKnown) ids.add(id)
  }
  for (const sl of lib.setlists) {
    sl.questionIds = sl.questionIds.filter((id) => ids.has(id))
  }
}

function rankLibraries(libs: readonly VenueLibraryData[]): VenueLibraryData[] {
  return [...libs].sort(
    (a, b) => b.setlists.length - a.setlists.length || b.questions.length - a.questions.length,
  )
}

/** The fullest room keeps its lists. Lists that exist only in another room are added. */
function sharedPlaylistShelf(ranked: readonly VenueLibraryData[]): Setlist[] {
  const shelf = ranked[0]!.setlists
  const seen = new Set(shelf.map((setlist) => setlist.id))
  for (const lib of ranked) {
    if (lib.setlists === shelf) continue
    for (const setlist of lib.setlists) {
      if (seen.has(setlist.id)) continue
      seen.add(setlist.id)
      shelf.push({ id: setlist.id, name: setlist.name, questionIds: [...setlist.questionIds] })
    }
  }
  return shelf
}

function questionsById(ranked: readonly VenueLibraryData[]): Map<string, Question> {
  const canonical = new Map<string, Question>()
  for (const lib of ranked) {
    for (const question of lib.questions) {
      if (!canonical.has(question.id)) canonical.set(question.id, question)
    }
  }
  return canonical
}

function copyMissingPlaylistQuestions(
  libs: readonly VenueLibraryData[],
  shelf: readonly Setlist[],
  canonical: ReadonlyMap<string, Question>,
): void {
  const needed = new Set(shelf.flatMap((setlist) => setlist.questionIds))
  for (const lib of libs) {
    for (const id of needed) {
      if (lib.questions.some((question) => question.id === id)) continue
      const question = canonical.get(id)
      if (question) lib.questions.push({ ...question })
    }
  }
}

/**
 * Playlists belong to the host, not to one room code.
 * Every room shares one shelf. A room that is missing a cue on that shelf receives a copy of the question.
 */
export function sharePlaylistsAcrossRooms(map: Map<string, VenueLibraryData>): void {
  const libs = [...new Set(map.values())]
  if (libs.length === 0) return
  const ranked = rankLibraries(libs)
  const shelf = sharedPlaylistShelf(ranked)
  for (const lib of libs) lib.setlists = shelf
  copyMissingPlaylistQuestions(libs, shelf, questionsById(ranked))
}
