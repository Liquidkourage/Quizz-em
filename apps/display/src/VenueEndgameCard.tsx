import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import { formatVenueBankroll, formatVenueDisplayPlayerName, formatVenueTriviaPoints } from './venueLeaderboard'
import type { VenueEndgameScore, VenueEndgameWinner } from './venueEndgame'

export default function VenueEndgameCard({
  winner,
  scores,
}: {
  winner: VenueEndgameWinner
  scores: readonly VenueEndgameScore[]
}) {
  const name = formatVenueDisplayPlayerName(winner.name) || winner.name
  return (
    <motion.div
      className="venue-endgame fixed inset-0 z-[210] flex items-center justify-center overflow-hidden bg-black/78 p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Winner, ${name}`}
      initial={false}
      animate={{ opacity: 1 }}
    >
      <DisplayWelcomeBackdrop />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.16),transparent_62%)]"
        aria-hidden
      />
      <motion.div
        className="venue-bust-overlay-panel relative z-10 flex w-[min(56rem,88vw)] flex-col items-stretch"
        initial={false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="venue-bust-overlay-header">
          <div className="min-w-0">
            <p className="venue-bust-overlay-eyebrow">One player left</p>
            <h2 className="venue-bust-overlay-title">Winner</h2>
          </div>
          <div
            className="venue-bust-overlay-wordmark hidden shrink-0 sm:block"
            style={{ aspectRatio: '958 / 592' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
        </div>
        <div className="venue-bust-overlay-row venue-bust-overlay-row--closed">
          <div className="venue-bust-overlay-row-line">
            <span className="venue-endgame-name">{name}</span>
            <span className="venue-bust-overlay-table-well">Table {winner.tableNum}</span>
          </div>
          <p className="venue-endgame-stack">{formatVenueBankroll(winner.bankroll)}</p>
        </div>
        {scores.length > 0 ? (
          <div className="venue-endgame-scores">
            <p className="venue-endgame-scores-title">Trivia scores</p>
            <ol className="venue-endgame-score-list">
              {scores.map((score, index) => (
                <li key={`${score.name}-${index}`} className="venue-endgame-score-row">
                  <span className="venue-endgame-score-rank">{index + 1}</span>
                  <span className="venue-endgame-score-name">
                    {formatVenueDisplayPlayerName(score.name) || score.name}
                  </span>
                  <span className="venue-endgame-score-points">{formatVenueTriviaPoints(score.answerPoints)}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
