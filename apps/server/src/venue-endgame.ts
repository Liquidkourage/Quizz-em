const BETWEEN_HANDS = new Set(['lobby', 'intermission'])

/** The last chip stack, once a hand has been paid and every occupied table is waiting. */
export function soleChipWinnerName(
  handsCompleted: number,
  tables: readonly { phase: string; players: readonly { name: string; bankroll: number }[] }[],
): string | null {
  if (handsCompleted < 1) return null
  const occupied = tables.filter((table) => table.players.some((player) => player.name.trim()))
  if (occupied.length === 0) return null
  const waiting = occupied.every((table) => BETWEEN_HANDS.has(table.phase.trim().toLowerCase()))
  if (!waiting) return null
  const stacks = occupied.flatMap((table) =>
    table.players.filter((player) => player.name.trim() && player.bankroll > 0),
  )
  return stacks.length === 1 ? stacks[0]!.name.trim() : null
}
