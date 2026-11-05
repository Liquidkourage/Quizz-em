function playerTableNum(tableId: string | null | undefined): number | null {
  const raw = (tableId ?? '').trim()
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  if (n <= 0) return null
  return n
}

/** Name this phone joined with, plus its numbered table when it has one. */
export function scoresSheetIdentity(selfName: string, tableId: string | null | undefined) {
  return { selfName, selfTableNum: playerTableNum(tableId) }
}
