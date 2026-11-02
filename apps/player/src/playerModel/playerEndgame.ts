export type PlayerEndgameView = {
  winnerName: string
  selfWon: boolean
  bankroll: number | null
}

function chipStack(bankroll: number | null | undefined): number | null {
  if (typeof bankroll !== 'number' || !(bankroll > 0)) return null
  return bankroll
}

function wonTheNight(selfName: string, winnerName: string, bankroll: number | null): boolean {
  return selfName.length > 0 && selfName === winnerName && bankroll != null
}

/** What this phone shows once the room has a single chip stack left. */
export function playerEndgameView(args: {
  winnerName?: string | null
  selfName?: string | null
  selfBankroll?: number | null
}): PlayerEndgameView | null {
  const winnerName = args.winnerName?.trim() ?? ''
  if (!winnerName) return null
  const bankroll = chipStack(args.selfBankroll)
  const selfWon = wonTheNight(args.selfName?.trim() ?? '', winnerName, bankroll)
  return { winnerName, selfWon, bankroll: selfWon ? bankroll : null }
}
