import type { GameState, PlayerState } from '@qhe/core'
import { formatTriviaNumber } from '@qhe/core'
import { triviaPointsForAnswer } from '../playerModel/handSummary'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type RevealShowdownPanelProps = {
  gameState: GameState
  currentPlayer: PlayerState
}

export default function RevealShowdownPanel({ gameState, currentPlayer }: RevealShowdownPanelProps) {
  const q = gameState.round.question
  if (!q || (gameState.phase !== 'reveal' && gameState.phase !== 'showdown' && gameState.phase !== 'payout')) {
    return null
  }

  const submitted = currentPlayer.submittedAnswer
  const correct = q.answer
  const folded = currentPlayer.hasFolded
  const pts = triviaPointsForAnswer(submitted, correct, folded)

  return (
    <PlayerGoldPanel title="Your result">
      {folded ? (
        <p className="player-game-result">You folded — no trivia score this hand.</p>
      ) : submitted == null ? (
        <p className="player-game-result">No answer submitted this hand.</p>
      ) : (
        <div className="player-game-result">
          <p>
            Your answer:{' '}
            <span className="player-game-result-mono">{formatTriviaNumber(submitted)}</span>
          </p>
          <p>
            Correct: <span className="player-game-result-correct">{formatTriviaNumber(correct)}</span>
          </p>
          <p>
            Trivia score this hand: <strong className="player-game-result-mono">{pts}</strong>
          </p>
        </div>
      )}
    </PlayerGoldPanel>
  )
}
