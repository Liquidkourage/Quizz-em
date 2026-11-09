import { roundTriviaPoints } from '@qhe/core'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { triviaLeaderboardSource } from './venueLeaderboard'

export type VenueEndgameWinner = {
  name: string
  tableNum: number
  bankroll: number
}

export type VenueEndgameWall = {
  venueChipSurvivorCount?: number | null
  venueHandsCompleted?: number | null
  /** Present when the server has already decided. Null means there is no winner yet. */
  endgameWinner?: VenueEndgameWinner | null
  tiles: readonly {
    tableNum: number
    phase?: string | null
    seatNames?: readonly string[] | null
    seatBankrolls?: readonly number[] | null
  }[]
}

const BETWEEN_HANDS = new Set(['lobby', 'intermission'])

function chipStacks(wall: VenueEndgameWall): VenueEndgameWinner[] {
  const stacks: VenueEndgameWinner[] = []
  for (const tile of wall.tiles) {
    const names = tile.seatNames ?? []
    const rolls = tile.seatBankrolls ?? []
    for (let i = 0; i < names.length; i++) {
      const name = names[i]?.trim() ?? ''
      const bankroll = rolls[i]
      if (!name || typeof bankroll !== 'number' || !(bankroll > 0)) continue
      stacks.push({ name, tableNum: tile.tableNum, bankroll })
    }
  }
  return stacks
}

/** Use the server's winner when this snapshot includes one. Older snapshots still read the chairs. */
export function venueEndgameWinner(wall: VenueEndgameWall | null): VenueEndgameWinner | null {
  if (wall != null && 'endgameWinner' in wall) return namedWinner(wall.endgameWinner)
  return winnerFromChairs(wall)
}

function namedWinner(winner: VenueEndgameWinner | null | undefined): VenueEndgameWinner | null {
  const name = winner?.name.trim() ?? ''
  if (!name || winner == null) return null
  return { name, tableNum: winner.tableNum, bankroll: winner.bankroll }
}

function winnerWire(raw: unknown): VenueEndgameWinner | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as { name?: unknown; tableNum?: unknown; bankroll?: unknown }
  const name = typeof row.name === 'string' ? row.name : ''
  const tableNum = typeof row.tableNum === 'number' && Number.isFinite(row.tableNum) ? Math.floor(row.tableNum) : 0
  const bankroll =
    typeof row.bankroll === 'number' && Number.isFinite(row.bankroll) ? Math.max(0, Math.floor(row.bankroll)) : 0
  return { name, tableNum, bankroll }
}

/** Copy the server winner onto the wall. Missing means an older server; null means no winner yet. */
export function endgameWinnerFromPayload(payload: object | null | undefined): VenueEndgameWinner | null | undefined {
  if (payload == null || !Object.prototype.hasOwnProperty.call(payload, 'endgameWinner')) return undefined
  return namedWinner(winnerWire((payload as { endgameWinner?: unknown }).endgameWinner))
}

/** Fields to copy onto the wall. Empty when this snapshot never said who won. */
export function endgameWinnerFields(
  payload: object | null | undefined,
): { endgameWinner?: VenueEndgameWinner | null } {
  const endgameWinner = endgameWinnerFromPayload(payload)
  return endgameWinner === undefined ? {} : { endgameWinner }
}

/** The last player with chips, once the room is between hands. */
function winnerFromChairs(wall: VenueEndgameWall | null): VenueEndgameWinner | null {
  if (wall == null || wall.venueChipSurvivorCount !== 1) return null
  if ((wall.venueHandsCompleted ?? 0) < 1) return null
  const seated = wall.tiles.filter((tile) => (tile.seatNames ?? []).some((name) => name.trim()))
  if (seated.length === 0) return null
  const betweenHands = seated.every((tile) => BETWEEN_HANDS.has(String(tile.phase ?? '').trim().toLowerCase()))
  if (!betweenHands) return null
  const stacks = chipStacks(wall)
  return stacks.length === 1 ? stacks[0]! : null
}

export type VenueEndgameScore = {
  name: string
  answerPoints: number
}

const VENUE_ENDGAME_TRIVIA_LIMIT = 20

export function endgameScoreRows(
  wall: DisplayVenueWallSnapshot | null,
): { name: string; answerPoints?: number }[] {
  if (wall?.restLeaders != null) {
    return wall.restLeaders.map((row) => ({ name: row.name, answerPoints: row.value }))
  }
  return triviaLeaderboardSource(wall?.tiles ?? [], wall?.pointsStandings ?? [], wall?.triviaField)
}

/** First twenty of an already ranked trivia list. */
export function venueEndgameTriviaTop(
  rows: readonly { name: string; answerPoints?: number | null }[],
): VenueEndgameScore[] {
  const scores: VenueEndgameScore[] = []
  for (const row of rows) {
    const name = row.name.trim()
    if (!name) continue
    const points = row.answerPoints
    scores.push({
      name,
      answerPoints: typeof points === 'number' && Number.isFinite(points) ? roundTriviaPoints(points) : 0,
    })
    if (scores.length === VENUE_ENDGAME_TRIVIA_LIMIT) break
  }
  return scores
}

/** The winner card follows the elimination card, then stays up. Trivia scores replace it when the host asks. */
export function endgameCoversFloor(
  winner: VenueEndgameWinner | null,
  overlays: { elimination: boolean; answer: boolean; scores: boolean },
): boolean {
  if (winner == null || overlays.scores) return false
  return !overlays.elimination && !overlays.answer
}
