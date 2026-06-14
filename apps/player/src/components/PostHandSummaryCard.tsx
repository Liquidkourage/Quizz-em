import type { HandSummary } from '../playerModel/handSummary'
import { Card } from '@qhe/ui'

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
    <Card variant="glass" className="mb-4 border border-emerald-500/30 p-4 sm:mb-6 sm:p-6">
      <h2 className="mb-3 text-center text-xl font-bold text-casino-emerald sm:text-2xl">Last hand</h2>
      <div className="grid grid-cols-2 gap-3 text-center text-sm sm:text-base">
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-white/60">Stack</div>
          <div
            className={`text-2xl font-bold tabular-nums ${summary.stackDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {formatDelta(summary.stackDelta, '$')}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-white/60">Trivia pts</div>
          <div className="text-2xl font-bold tabular-nums text-casino-emerald">
            {formatDelta(summary.pointsGained, '')}
          </div>
        </div>
      </div>
      {summary.formattedSubmitted != null ? (
        <p className="mt-4 text-center text-sm text-white/75">
          Your answer: <span className="font-mono font-bold text-casino-gold">{summary.formattedSubmitted}</span>
          {summary.formattedCorrect != null ? (
            <>
              {' '}
              · Correct: <span className="font-mono font-bold text-emerald-300">{summary.formattedCorrect}</span>
            </>
          ) : null}
          {' '}
          · This hand: <span className="font-bold text-casino-emerald">{summary.triviaPointsThisHand}</span> pts
        </p>
      ) : null}
    </Card>
  )
}
