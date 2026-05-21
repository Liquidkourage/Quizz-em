import type { GameState, NumericCard, PlayerState, Question } from './index'
import { VENUE_NUMBERED_TABLE_MAX, VENUE_WALL_SEAT_SLOTS } from './venueConstants'

/** Shared copy for venue-wall tiles and seeded read-only display sessions (before any host mutates that table). */
export const DISPLAY_PREVIEW_DEMO_QUESTION_TEXT =
  'In whole minutes, boiling point of pure water at standard atmospheric pressure?'

/** °C at 1 atm (whole number) — matches overview “minutes” framing as numeric whole. */
export const DISPLAY_PREVIEW_DEMO_QUESTION_ANSWER = 100

export const DISPLAY_PREVIEW_SYNCED_PHASE = 'answering' as const

export const DISPLAY_PREVIEW_SYNCED_SUBTITLE =
  'Shared deadline when answering — countdown is identical venue-wide.'

/** Deterministic seated count 5–8 for rehearsal / offline wall previews (tableNum is 1-based). */
export function rehearsalSeatedCountForTable(tableNum: number): number {
  const i = Math.max(0, Math.floor(tableNum) - 1)
  const pattern = [6, 7, 5, 8] as const
  return pattern[i % pattern.length]!
}

/** Per-table snapshot: occupied seats (of 8) and local pot — {@link VENUE_NUMBERED_TABLE_MAX} felts. */
export const DISPLAY_PREVIEW_TABLES = Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, i) => {
  const tableNum = i + 1
  return {
    seated: rehearsalSeatedCountForTable(tableNum),
    pot: 380 + ((i * 67) % 980),
  }
}) as ReadonlyArray<{ readonly seated: number; readonly pot: number }>

/** First names cycle for rehearsal CPUs and venue-wall previews (paired with surnames for initials). */
const REHEARSAL_FIRST = [
  'Alice',
  'Blake',
  'Carla',
  'Devon',
  'Elena',
  'Frank',
  'Grace',
  'Hugo',
  'Iris',
  'Jamal',
  'Kim',
  'Liam',
  'Maria',
  'Noah',
  'Opal',
  'Priya',
] as const

/** Surnames — only the first letter is shown on CPUs (“First L.”). */
const REHEARSAL_SUR = [
  'Adams',
  'Bennett',
  'Cruz',
  'Diaz',
  'Ellis',
  'Ford',
  'Garcia',
  'Hayes',
  'Inoue',
  'Jones',
  'Khan',
  'Lewis',
  'Moore',
  'Nguyen',
  'Ortiz',
  'Patel',
] as const

/**
 * Shared rehearsal/CPU display name: first name plus surname initial (e.g. `Alice S.`).
 * Deterministic from seat index so venue previews and server `vp:*` seats stay consistent.
 */
export function rehearsalSeatDisplayName(seatIndex: number): string {
  const i = Math.max(0, Math.floor(seatIndex))
  const first = REHEARSAL_FIRST[i % REHEARSAL_FIRST.length]!
  const sur = REHEARSAL_SUR[(i * 5 + 2) % REHEARSAL_SUR.length]!
  const L = sur.charAt(0).toUpperCase()
  return `${first} ${L}.`
}

/** Seat labels for table 1 in venue-wall preview — matches `rehearsalSeatDisplayName(0..7)`. */
export const DISPLAY_PREVIEW_NAMES: readonly string[] = Array.from(
  { length: VENUE_WALL_SEAT_SLOTS },
  (_, i) => rehearsalSeatDisplayName(i)
)

export const DISPLAY_PREVIEW_BANKROLLS = [
  1200, 850, 1100, 950, 1350, 700, 1600, 900,
] as const

/** Roster size per numbered table for the live rehearsal seed (tables 1…{@link VENUE_NUMBERED_TABLE_MAX}). */
export function rehearsalVenueTableRosterSizes(): readonly number[] {
  return Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, i) =>
    rehearsalSeatedCountForTable(i + 1)
  )
}

export function normalizeDisplayPreviewTableNum(tableId: string): number {
  const n = Number.parseInt(String(tableId).trim(), 10)
  if (!Number.isInteger(n) || n < 1 || n > VENUE_NUMBERED_TABLE_MAX) return 1
  return n
}

function digit(n: number): NumericCard {
  const d = ((n % 10) + 10) % 10
  return { digit: d as NumericCard['digit'] }
}

/** Deterministic “rehearsal” table: same roster/pot/trivia the venue wall mocks advertise. */
export function buildDisplayPreviewGameState(code: string, rawTableId: string): GameState {
  const tableNum = normalizeDisplayPreviewTableNum(rawTableId)
  const tableId = String(tableNum)
  const idx = tableNum - 1
  const snap = DISPLAY_PREVIEW_TABLES[idx] ?? DISPLAY_PREVIEW_TABLES[0]

  const players: PlayerState[] = []
  for (let i = 0; i < snap.seated; i++) {
    const globalSeat = idx * VENUE_WALL_SEAT_SLOTS + i
    players.push({
      id: `vp:preview:${tableId}:${i}`,
      name: rehearsalSeatDisplayName(globalSeat),
      bankroll: DISPLAY_PREVIEW_BANKROLLS[i % DISPLAY_PREVIEW_BANKROLLS.length]!,
      hand: [digit(i + 3), digit(i + 7)],
      hasFolded: false,
      isAllIn: false,
    })
  }

  const question: Question = {
    id: 'display-preview-q',
    text: DISPLAY_PREVIEW_DEMO_QUESTION_TEXT,
    answer: DISPLAY_PREVIEW_DEMO_QUESTION_ANSWER,
  }

  return {
    code,
    tableId,
    hostId: 'display-preview',
    createdAt: Date.now(),
    phase: 'answering',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: 32,
    players,
    round: {
      roundId: 'preview-r1',
      question,
      communityCards: [digit(1), digit(0), digit(0)],
      pot: snap.pot,
      dealerIndex: 0,
      bettingRound: 2,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
      answerDeadline: Date.now() + 43_000,
    },
  }
}
