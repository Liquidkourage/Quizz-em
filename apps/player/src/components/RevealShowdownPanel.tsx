import type { GameState, PlayerState } from '@qhe/core'
import { formatTriviaNumber, formatTriviaPoints } from '@qhe/core'
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
  const pts = triviaPointsForAnswer(submitted, correct)

  return (
    <PlayerGoldPanel title="Your result">
      {submitted == null ? (
        <p className="player-game-result">
          {folded
            ? 'Folded chips — no answer submitted this hand.'
            : 'No answer submitted this hand.'}
        </p>
      ) : (
        <div className="player-game-result">
          <p>
            Your answer:{' '}
            <span className="player-game-result-mono">{formatTriviaNumber(submitted)}</span>
            {folded ? <span className="text-white/50"> · folded chips</span> : null}
          </p>
          <p>
            Correct: <span className="player-game-result-correct">{formatTriviaNumber(correct)}</span>
          </p>
          <p>
            Trivia score this hand: <strong className="player-game-result-mono">{formatTriviaPoints(pts)}</strong>
          </p>
        </div>
      )}
    </PlayerGoldPanel>
  )
}
