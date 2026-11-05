import { balancedPhysicalSeats } from '@qhe/core'

/** Chip-contest chairs. Points-only players keep the chair they were given and are not drawn. */
export function playerFeltRoster<T extends { pointsOnly?: boolean }>(
  players: readonly T[],
): { player: T; rosterIndex: number; chair: number }[] {
  const seatOf = balancedPhysicalSeats(players.length)
  const drawn: { player: T; rosterIndex: number; chair: number }[] = []
  for (let rosterIndex = 0; rosterIndex < players.length; rosterIndex++) {
    const player = players[rosterIndex]
    const chair = seatOf[rosterIndex]
    if (player == null || chair == null || player.pointsOnly === true) continue
    drawn.push({ player, rosterIndex, chair })
  }
  return drawn
}
