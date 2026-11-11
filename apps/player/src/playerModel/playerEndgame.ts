export type PlayerEndgameView = {
  winnerName: string
  chipNames: string[]
  pointsNames: string[]
  selfWonChips: boolean
  selfWonPoints: boolean
  bankroll: number | null
}

function chipStack(bankroll: number | null | undefined): number | null {
  if (typeof bankroll !== 'number' || !(bankroll > 0)) return null
  return bankroll
}

function wonTheNight(selfName: string, winnerName: string, bankroll: number | null): boolean {
  return selfName.length > 0 && selfName === winnerName && bankroll != null
}

function namedList(names: readonly string[] | null | undefined, fallback: string): string[] {
  const list = (names ?? []).map((name) => name.trim()).filter((name) => name.length > 0)
  if (list.length > 0) return list
  return fallback ? [fallback] : []
}

/** What this phone shows once the night has a chip winner and a points winner. */
export function playerEndgameView(args: {
  winnerName?: string | null
  chipNames?: readonly string[] | null
  pointsNames?: readonly string[] | null
  selfName?: string | null
  selfBankroll?: number | null
}): PlayerEndgameView | null {
  const winnerName = args.winnerName?.trim() ?? ''
  const chipNames = namedList(args.chipNames, winnerName)
  const pointsNames = namedList(args.pointsNames, '')
  if (chipNames.length === 0 && pointsNames.length === 0) return null
  const bankroll = chipStack(args.selfBankroll)
  const selfName = args.selfName?.trim() ?? ''
  const selfWonChips = chipNames.some((name) => wonTheNight(selfName, name, bankroll))
  const selfWonPoints = pointsNames.some((name) => selfName.length > 0 && selfName === name)
  return {
    winnerName: chipNames[0] ?? pointsNames[0] ?? winnerName,
    chipNames,
    pointsNames,
    selfWonChips,
    selfWonPoints,
    bankroll: selfWonChips ? bankroll : null,
  }
}
