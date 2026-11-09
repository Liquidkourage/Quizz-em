export type PlayerPublicSeat = {
  name: string
  bankroll: number
  pointsOnly: boolean
  tableNum: number
  answerPoints?: number
}

export type PlayerScoreRow = {
  name: string
  value: number
  tableNum: number | null
  points?: number
}

export type PlayerPublicScoreFields = {
  scoresBoard: 'chips' | 'trivia' | null
  scores: PlayerScoreRow[]
}

function byDisplayName(a: string, b: string): number {
  const af = a.trim().split(/\s+/)[0] ?? a
  const bf = b.trim().split(/\s+/)[0] ?? b
  const cmp = af.localeCompare(bf, undefined, { sensitivity: 'base' })
  if (cmp !== 0) return cmp
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function byScoreThenName(a: PlayerScoreRow, b: PlayerScoreRow): number {
  if (b.value !== a.value) return b.value - a.value
  return byDisplayName(a.name, b.name)
}

function chipRows(seats: readonly PlayerPublicSeat[]): PlayerScoreRow[] {
  const rows: PlayerScoreRow[] = []
  for (const seat of seats) {
    const name = seat.name.trim()
    if (!name || seat.pointsOnly) continue
    rows.push({
      name,
      value: Math.max(0, Math.floor(seat.bankroll)),
      tableNum: seat.tableNum,
      points: Number.isFinite(seat.answerPoints) ? Math.max(0, seat.answerPoints ?? 0) : 0,
    })
  }
  rows.sort(byScoreThenName)
  return rows
}

function triviaRows(field: readonly { name: string; answerPoints: number }[]): PlayerScoreRow[] {
  const rows: PlayerScoreRow[] = []
  for (const row of field) {
    const name = row.name.trim()
    if (!name) continue
    const pts = row.answerPoints
    rows.push({
      name,
      value: typeof pts === 'number' && Number.isFinite(pts) ? pts : 0,
      tableNum: null,
    })
  }
  rows.sort(byScoreThenName)
  return rows
}

function restRows(
  seats: readonly PlayerPublicSeat[],
  field: readonly { name: string; answerPoints: number }[],
): PlayerScoreRow[] {
  const chips = new Set(
    seats.filter((seat) => !seat.pointsOnly && seat.name.trim()).map((seat) => seat.name.trim().toLowerCase()),
  )
  return triviaRows(field).filter((row) => !chips.has(row.name.trim().toLowerCase()))
}

export function publicScoreSeats(
  tables: readonly {
    tableNum: number
    players: readonly { name: string; bankroll: number; pointsOnly?: boolean; answerPoints?: number }[]
  }[],
): PlayerPublicSeat[] {
  const seats: PlayerPublicSeat[] = []
  for (const table of tables) {
    if (!Number.isFinite(table.tableNum)) continue
    for (const player of table.players) {
      seats.push({
        name: player.name,
        bankroll: player.bankroll,
        pointsOnly: player.pointsOnly === true,
        tableNum: table.tableNum,
        answerPoints: player.answerPoints,
      })
    }
  }
  return seats
}

/** Chip or trivia scores while the host has that board on the TVs. Other modes send an empty board. */
export function playerPublicScores(
  wallView: string | null | undefined,
  seats: readonly PlayerPublicSeat[],
  trivia: readonly { name: string; answerPoints: number }[],
): PlayerPublicScoreFields {
  if (wallView === 'leaderboard') return { scoresBoard: 'chips', scores: chipRows(seats) }
  if (wallView === 'leaderboard-trivia') return { scoresBoard: 'trivia', scores: restRows(seats, trivia) }
  return { scoresBoard: null, scores: [] }
}
