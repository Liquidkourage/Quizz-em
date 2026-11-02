export type VenueEndgameWinner = {
  name: string
  tableNum: number
  bankroll: number
}

export type VenueEndgameWall = {
  venueChipSurvivorCount?: number | null
  venueHandsCompleted?: number | null
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

/** The last player with chips, once the room is between hands. */
export function venueEndgameWinner(wall: VenueEndgameWall | null): VenueEndgameWinner | null {
  if (wall == null || wall.venueChipSurvivorCount !== 1) return null
  if ((wall.venueHandsCompleted ?? 0) < 1) return null
  const seated = wall.tiles.filter((tile) => (tile.seatNames ?? []).some((name) => name.trim()))
  if (seated.length === 0) return null
  const betweenHands = seated.every((tile) => BETWEEN_HANDS.has(String(tile.phase ?? '').trim().toLowerCase()))
  if (!betweenHands) return null
  const stacks = chipStacks(wall)
  return stacks.length === 1 ? stacks[0]! : null
}

/** The winner card follows the elimination card, then stays up. */
export function endgameCoversFloor(
  winner: VenueEndgameWinner | null,
  overlays: { elimination: boolean; answer: boolean },
): boolean {
  if (winner == null) return false
  return !overlays.elimination && !overlays.answer
}
