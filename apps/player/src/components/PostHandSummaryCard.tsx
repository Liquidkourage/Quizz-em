import type { HandSummary } from '../playerModel/handSummary'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type PostHandSummaryCardProps = {
  summary: HandSummary
}

function formatDelta(n: number, prefix: string): string {
  if (n === 0) return `${prefix}0`
  const sign = n > 0 ? '+' : '−'
  return `${sign}${prefix}${Math.abs(n).toLocaleString()}`
}

export default function PostHandSummaryCard({ summary }: PostHandSummaryCardProps) {
  return (
    <PlayerGoldPanel title="Last hand">
      <div className="player-game-delta-grid">
        <div className="player-game-delta-cell">
          <div className="player-game-delta-label">Stack</div>
          <div
            className={`player-game-delta-value ${summary.stackDelta >= 0 ? 'player-game-delta-value--up' : 'player-game-delta-value--down'}`}
          >
            {formatDelta(summary.stackDelta, '$')}
          </div>
        </div>
        <div className="player-game-delta-cell">
          <div className="player-game-delta-label">Trivia pts</div>
          <div className="player-game-delta-value player-game-delta-value--up">
            {formatDelta(summary.pointsGained, '')}
          </div>
        </div>
      </div>
      {summary.formattedSubmitted != null ? (
        <p className="player-game-result" style={{ marginTop: '0.85rem' }}>
          Your answer: <span className="player-game-result-mono">{summary.formattedSubmitted}</span>
          {summary.formattedCorrect != null ? (
            <>
              {' '}
              · Correct: <span className="player-game-result-correct">{summary.formattedCorrect}</span>
            </>
          ) : null}
          {' '}
          · This hand: <strong className="player-game-result-mono">{summary.triviaPointsThisHand}</strong> pts
        </p>
      ) : null}
    </PlayerGoldPanel>
  )
}
