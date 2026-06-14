import { Card } from '@qhe/ui'
import type { GameState, PlayerState } from '@qhe/core'
import { formatTriviaNumber } from '@qhe/core'
import { triviaPointsForAnswer } from '../playerModel/handSummary'

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
    <Card variant="glass" className="mb-4 border border-purple-500/25 p-4 sm:mb-6 sm:p-6">
      <h2 className="mb-3 text-center text-xl font-bold text-purple-300 sm:text-2xl">Your result</h2>
      {folded ? (
        <p className="text-center text-white/70">You folded — no trivia score this hand.</p>
      ) : submitted == null ? (
        <p className="text-center text-white/70">No answer submitted this hand.</p>
      ) : (
        <div className="space-y-2 text-center text-sm sm:text-base">
          <p>
            Your answer:{' '}
            <span className="font-mono text-xl font-bold text-casino-gold">{formatTriviaNumber(submitted)}</span>
          </p>
          <p>
            Correct:{' '}
            <span className="font-mono text-xl font-bold text-emerald-300">{formatTriviaNumber(correct)}</span>
          </p>
          <p className="text-white/75">
            Trivia score this hand: <span className="font-bold text-casino-emerald">{pts}</span>
          </p>
        </div>
      )}
    </Card>
  )
}
