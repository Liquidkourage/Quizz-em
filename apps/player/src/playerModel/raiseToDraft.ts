/** Digits the player has typed for a raise-to total. Commit only a legal raise. */
export function raiseToDraft(
  typed: string,
  toCall: number,
  minRaiseBy: number,
  maxRaiseBy: number,
): { text: string; raiseBy: number | null } {
  const text = typed.replace(/\D/g, '')
  if (text === '') return { text, raiseBy: null }
  const raiseBy = Math.floor(Number(text) - toCall)
  if (!Number.isFinite(raiseBy) || raiseBy < minRaiseBy || raiseBy > maxRaiseBy) {
    return { text, raiseBy: null }
  }
  return { text, raiseBy }
}
