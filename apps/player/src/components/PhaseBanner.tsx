import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

type PhaseBannerProps = {
  gameState: GameState
}

export default function PhaseBanner({ gameState }: PhaseBannerProps) {
  const { phase, tableId } = gameState

  if (tableId === LOBBY_TABLE_ID && phase === 'lobby') {
    return null
  }

  if (phase === 'lobby' && tableId !== LOBBY_TABLE_ID) {
    return (
      <p className="player-game-banner">Hand complete — waiting for the host to reveal the next question.</p>
    )
  }

  if (phase === 'question') {
    return (
      <p className="player-game-banner">
        Hole cards dealt — the host will reveal the trivia question to open wagering.
      </p>
    )
  }

  if (phase === 'reveal') {
    return (
      <p className="player-game-banner">
        Answers revealed — compare guesses before the host pays out the pot.
      </p>
    )
  }

  if (phase === 'showdown' || phase === 'payout') {
    return (
      <p className="player-game-banner">Showdown — chips and trivia points are being settled.</p>
    )
  }

  if (phase === 'intermission') {
    return <p className="player-game-banner">Intermission — stand by for the next round.</p>
  }

  return null
}
