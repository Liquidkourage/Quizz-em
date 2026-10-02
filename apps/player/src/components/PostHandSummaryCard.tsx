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

/** Personal stack/pts deltas only — answers live on Table results. */
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
    </PlayerGoldPanel>
  )
}
