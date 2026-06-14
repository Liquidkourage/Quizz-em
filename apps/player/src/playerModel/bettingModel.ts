import type { GameState, PlayerState } from '@qhe/core'
import { inChipContest } from '@qhe/core'

export type BettingContext = {
  isBettingPhase: boolean
  isBettingOpen: boolean
  isMyTurn: boolean
  myContribution: number
  currentBet: number
  toCall: number
  minRaise: number
  canBet: boolean
  canCheck: boolean
  canCall: boolean
  canRaise: boolean
  canAllIn: boolean
  canFold: boolean
}

export function resolveMyPlayerIndex(
  gameState: GameState,
  playerName: string,
  socketId: string | undefined
): number {
  if (socketId) {
    const byId = gameState.players.findIndex((p) => p.id === socketId)
    if (byId >= 0) return byId
  }
  return gameState.players.findIndex((p) => p.name === playerName)
}

export function buildBettingContext(args: {
  gameState: GameState
  currentPlayer: PlayerState | undefined
  myIndex: number
  raiseAmount: number
}): BettingContext {
  const { gameState, currentPlayer, myIndex, raiseAmount } = args
  const isBettingPhase = gameState.phase === 'betting'
  const isBettingOpen = gameState.round.isBettingOpen === true
  const playerBets = gameState.round.playerBets
  const myContribution = currentPlayer ? (playerBets?.[currentPlayer.id] ?? 0) : 0
  const currentBet = gameState.round.currentBet ?? 0
  const toCall = Math.max(0, currentBet - myContribution)
  const minRaise = gameState.bigBlind || 0
  const bankroll = currentPlayer?.bankroll ?? 0

  const isMyTurn =
    isBettingPhase &&
    isBettingOpen &&
    typeof gameState.round.currentPlayerIndex === 'number' &&
    gameState.round.currentPlayerIndex === myIndex &&
    !!currentPlayer &&
    inChipContest(currentPlayer) &&
    !currentPlayer.hasFolded

  const canBet =
    isBettingPhase && !!currentPlayer && inChipContest(currentPlayer) && !currentPlayer.hasFolded

  return {
    isBettingPhase,
    isBettingOpen,
    isMyTurn,
    myContribution,
    currentBet,
    toCall,
    minRaise,
    canBet,
    canCheck: isMyTurn && toCall === 0,
    canCall: isMyTurn && toCall > 0 && bankroll > 0,
    canRaise:
      isMyTurn &&
      bankroll > toCall &&
      raiseAmount >= minRaise &&
      toCall + raiseAmount <= bankroll,
    canAllIn: isMyTurn && bankroll > 0,
    canFold: isMyTurn && canBet,
  }
}
