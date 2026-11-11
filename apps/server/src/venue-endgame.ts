const BETWEEN_HANDS = new Set(['lobby', 'intermission'])

export type SoleChipWinner = { name: string; tableNum: number; bankroll: number }

type WinnerPlayer = { name: string; bankroll: number; answerPoints?: number }

type WinnerTable = {
  tableNum?: number
  phase: string
  players: readonly WinnerPlayer[]
}

export type NightAwards = {
  chipWinners: SoleChipWinner[]
  pointsWinners: { name: string; points: number }[]
}

type ScoredSeat = { name: string; tableNum: number; bankroll: number; points: number }

function stacksInWaitingRoom(tables: readonly WinnerTable[]): SoleChipWinner[] {
  const occupied = tables.filter((table) => table.players.some((player) => player.name.trim()))
  if (occupied.length === 0) return []
  const waiting = occupied.every((table) => BETWEEN_HANDS.has(table.phase.trim().toLowerCase()))
  if (!waiting) return []
  return occupied.flatMap((table) =>
    table.players
      .filter((player) => player.name.trim() && player.bankroll > 0)
      .map((player) => ({
        name: player.name.trim(),
        tableNum: table.tableNum ?? 0,
        bankroll: player.bankroll,
      })),
  )
}

/** The last chip stack, once a hand has been paid and every occupied table is waiting. */
export function soleChipWinner(handsCompleted: number, tables: readonly WinnerTable[]): SoleChipWinner | null {
  if (handsCompleted < 1) return null
  const stacks = stacksInWaitingRoom(tables)
  return stacks.length === 1 ? stacks[0]! : null
}

/** Name of {@link soleChipWinner}, for phones and the host desk. */
export function soleChipWinnerName(handsCompleted: number, tables: readonly WinnerTable[]): string | null {
  return soleChipWinner(handsCompleted, tables)?.name ?? null
}

function finitePoints(points: number | undefined): number {
  return typeof points === 'number' && Number.isFinite(points) ? points : 0
}

function topTied<T>(rows: readonly T[], value: (row: T) => number): T[] {
  if (rows.length === 0) return []
  const best = Math.max(...rows.map(value))
  return rows.filter((row) => value(row) === best)
}

function scoredSeats(tables: readonly WinnerTable[]): ScoredSeat[] {
  const seats: ScoredSeat[] = []
  for (const table of tables) {
    for (const player of table.players) {
      const name = player.name.trim()
      if (!name) continue
      seats.push({
        name,
        tableNum: table.tableNum ?? 0,
        bankroll: player.bankroll,
        points: finitePoints(player.answerPoints),
      })
    }
  }
  return seats
}

function pointsBoard(
  seats: readonly ScoredSeat[],
  field: readonly { name: string; points: number }[],
): { name: string; points: number }[] {
  const byName = new Map<string, { name: string; points: number }>()
  const add = (name: string, points: number) => {
    const label = name.trim()
    if (!label) return
    const key = label.toLowerCase()
    const prev = byName.get(key)
    const next = finitePoints(points)
    if (!prev || next > prev.points) byName.set(key, { name: label, points: next })
  }
  for (const seat of seats) add(seat.name, seat.points)
  for (const row of field) add(row.name, row.points)
  return [...byName.values()]
}

/**
 * Chip winner and a separate points winner.
 * One stack ends the night early. Otherwise the night ends on the question limit.
 */
export function nightAwards(
  handsCompleted: number,
  questionLimit: number,
  tables: readonly WinnerTable[],
  field: readonly { name: string; points: number }[] = [],
): NightAwards | null {
  if (handsCompleted < 1 || !waitingRoom(tables)) return null
  const seats = scoredSeats(tables)
  const stacks = seats.filter((seat) => seat.bankroll > 0)
  const limitReached = handsCompleted >= questionLimit
  if (stacks.length !== 1 && !(limitReached && seats.length > 0)) return null
  const richest = topTied(stacks, (seat) => seat.bankroll)
  const chipWinners = topTied(richest, (seat) => pointsOf(seat, field)).map((seat) => ({
    name: seat.name,
    tableNum: seat.tableNum,
    bankroll: seat.bankroll,
  }))
  const taken = new Set(chipWinners.map((winner) => winner.name.toLowerCase()))
  const rest = pointsBoard(seats, field).filter((row) => !taken.has(row.name.toLowerCase()))
  const pointsWinners = topTied(rest, (row) => row.points)
  if (chipWinners.length === 0 && pointsWinners.length === 0) return null
  return { chipWinners, pointsWinners }
}

function waitingRoom(tables: readonly WinnerTable[]): boolean {
  const occupied = tables.filter((table) => table.players.some((player) => player.name.trim()))
  if (occupied.length === 0) return false
  return occupied.every((table) => BETWEEN_HANDS.has(table.phase.trim().toLowerCase()))
}

function pointsOf(seat: ScoredSeat, field: readonly { name: string; points: number }[]): number {
  const key = seat.name.toLowerCase()
  const remembered = field.find((row) => row.name.trim().toLowerCase() === key)
  return Math.max(seat.points, finitePoints(remembered?.points))
}
