const BETWEEN_HANDS = new Set(['lobby', 'intermission'])

/** The last chip stack, once a hand has been paid and every live table is waiting. */
export function hostEndgameWinnerName(brief: {
  fieldPlayerCount: number
  handsCompleted?: number
  actionRows: readonly { phase: string; seated: number }[]
  roster: readonly { name: string }[]
} | null): string | null {
  if (brief == null || brief.fieldPlayerCount !== 1) return null
  if ((brief.handsCompleted ?? 0) < 1) return null
  const live = brief.actionRows.filter((row) => row.seated > 0)
  if (live.length === 0) return null
  const waiting = live.every((row) => BETWEEN_HANDS.has(row.phase.trim().toLowerCase()))
  if (!waiting) return null
  const names = brief.roster.map((seat) => seat.name.trim()).filter((name) => name.length > 0)
  return names.length === 1 ? names[0]! : null
}

export function hostEndgameHeadline(winner: string): { title: string; detail: string } {
  return { title: 'Game over', detail: `${winner} has the last stack.` }
}
