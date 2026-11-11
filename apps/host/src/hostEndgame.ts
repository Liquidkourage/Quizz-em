/** The winner name the room already published. Busted players can still be on the roster. */
export function hostEndgameWinnerName(brief: { endgameWinnerName?: string | null } | null): string | null {
  const name = brief?.endgameWinnerName?.trim() ?? ''
  return name.length > 0 ? name : null
}

export function hostEndgameHeadline(
  winner: string,
  pointsNames?: readonly string[] | null,
): { title: string; detail: string } {
  const points = (pointsNames ?? []).map((name) => name.trim()).filter((name) => name.length > 0)
  const detail = points.length > 0 ? `Chips: ${winner}. Points: ${points.join(', ')}.` : `Chips: ${winner}.`
  return { title: 'Game over', detail }
}
