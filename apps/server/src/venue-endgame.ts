const BETWEEN_HANDS = new Set(['lobby', 'intermission'])

export type SoleChipWinner = { name: string; tableNum: number; bankroll: number }

type WinnerTable = {
  tableNum?: number
  phase: string
  players: readonly { name: string; bankroll: number }[]
}

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
