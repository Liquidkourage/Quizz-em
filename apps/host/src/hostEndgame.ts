/** The winner name the room already published. Busted players can still be on the roster. */
export function hostEndgameWinnerName(brief: { endgameWinnerName?: string | null } | null): string | null {
  const name = brief?.endgameWinnerName?.trim() ?? ''
  return name.length > 0 ? name : null
}

export function hostEndgameHeadline(winner: string): { title: string; detail: string } {
  return { title: 'Game over', detail: `${winner} has the last stack.` }
}
