export type GhostSeat = {
  id: string
  bankroll: number
  pointsOnly?: boolean
  ghostHostId?: string
}

function hostStillStacked(hostId: string | undefined, cleared: readonly GhostSeat[]): string | null {
  if (!hostId) return null
  const host = cleared.find((player) => player.id === hostId)
  if (!host || host.pointsOnly === true || host.bankroll <= 0) return null
  return hostId
}

function keepOrClearGhost<T extends GhostSeat>(
  player: T,
  prior: T | undefined,
  cleared: readonly T[],
): T {
  if (player.pointsOnly !== true) return { ...player, ghostHostId: undefined }
  const kept = hostStillStacked(prior?.ghostHostId, cleared)
  if (kept) return { ...player, ghostHostId: kept }
  return { ...player, ghostHostId: undefined }
}

function chainedHost<T extends GhostSeat>(
  priorHostId: string | undefined,
  byId: ReadonlyMap<string, T>,
): string | null {
  if (!priorHostId) return null
  const host = byId.get(priorHostId)
  if (!host || host.pointsOnly !== true) return null
  return host.ghostHostId ?? null
}

function fillOpenGhosts<T extends GhostSeat>(
  stamped: readonly T[],
  prior: ReadonlyMap<string, T>,
  winners: readonly string[],
): T[] {
  const byId = new Map(stamped.map((player) => [player.id, player]))
  let cursor = 0
  return stamped.map((player) => {
    if (player.pointsOnly !== true || player.ghostHostId) return player
    const chained = chainedHost(prior.get(player.id)?.ghostHostId, byId)
    if (chained) return { ...player, ghostHostId: chained }
    if (winners.length === 0) return player
    const ghostHostId = winners[cursor % winners.length]!
    cursor += 1
    return { ...player, ghostHostId }
  })
}

/** Remember who took the main pot. A ghost keeps that host while the host still has chips. */
export function assignGhostHosts<T extends GhostSeat>(
  before: readonly T[],
  cleared: readonly T[],
  winnerIds: readonly string[],
): T[] {
  const prior = new Map(before.map((player) => [player.id, player]))
  const winners = winnerIds.filter((id) => hostStillStacked(id, cleared))
  const stamped = cleared.map((player) => keepOrClearGhost(player, prior.get(player.id), cleared))
  return fillOpenGhosts(stamped, prior, winners)
}

/** Put each busted player on the table where the chip player they follow is sitting. */
export function seatGhostsBesideHosts<T extends GhostSeat>(
  tables: ReadonlyMap<number, readonly T[]>,
  ghosts: readonly T[],
): Map<number, T[]> {
  const next = new Map<number, T[]>()
  const hostTable = new Map<string, number>()
  for (const [tableNum, players] of tables) {
    const chipPlayers = players.filter((player) => player.pointsOnly !== true)
    next.set(tableNum, chipPlayers)
    for (const player of chipPlayers) hostTable.set(player.id, tableNum)
  }
  for (const ghost of ghosts) {
    const tableNum = ghost.ghostHostId ? hostTable.get(ghost.ghostHostId) : undefined
    if (tableNum == null) continue
    const list = next.get(tableNum) ?? []
    if (list.some((player) => player.id === ghost.id)) continue
    next.set(tableNum, list.concat(ghost))
  }
  return next
}
