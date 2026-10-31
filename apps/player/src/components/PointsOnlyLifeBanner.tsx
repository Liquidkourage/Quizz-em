import { formatTriviaPoints } from '@qhe/core'

type PointsOnlyLifeBannerProps = {
  answerPoints: number
  /** Compact strip under sticky question during chip-free hands. */
  compact?: boolean
}

/** Second-life copy when a seat is busted but still playing for trivia points. */
export default function PointsOnlyLifeBanner({ answerPoints, compact = false }: PointsOnlyLifeBannerProps) {
  if (compact) {
    return (
      <p className="player-points-only-banner player-points-only-banner--compact" role="status">
        <span className="player-points-only-banner-kicker">Second life</span>
        <span className="player-points-only-banner-body">
          Chip contest over — keep answering for trivia pts (
          <strong>{formatTriviaPoints(answerPoints)}</strong>)
        </span>
      </p>
    )
  }

  return (
    <div className="player-points-only-banner" role="status">
      <p className="player-points-only-banner-kicker">Second life · Points only</p>
      <p className="player-points-only-banner-body">
        You&apos;re out of chips but still in the trivia race. Compose answers each hand — no
        wagering, just points.
      </p>
      <p className="player-points-only-banner-score">
        Trivia score <strong>{formatTriviaPoints(answerPoints)}</strong>
      </p>
    </div>
  )
}
