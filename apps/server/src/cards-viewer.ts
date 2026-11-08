/**
 * Whose hole cards this socket may see. The seat it joined as still counts
 * after a newer phone takes over the action socket.
 */
export function cardsViewerId(
  role: string | undefined,
  joinedAs: string | undefined,
  actionSocketFor: string | undefined,
): string | null {
  if (role !== 'player') return null
  return joinedAs ?? actionSocketFor ?? null
}
