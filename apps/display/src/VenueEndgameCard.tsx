import { motion } from 'framer-motion'
import { ChipText, QuizzEmWordmark } from '@qhe/ui'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import { formatVenueBankroll, formatVenueDisplayPlayerName, formatVenueTriviaPoints } from './venueLeaderboard'
import type { VenueEndgameScore, VenueEndgameWinner } from './venueEndgame'

const ENDGAME_MEDALS = {
  1: { label: 'Gold medal', row: 'venue-endgame-score-row--gold', rim: '#f59e0b', face: '#fbbf24', shine: '#fef3c7', deep: '#b45309' },
  2: { label: 'Silver medal', row: 'venue-endgame-score-row--silver', rim: '#94a3b8', face: '#cbd5e1', shine: '#f8fafc', deep: '#64748b' },
  3: { label: 'Bronze medal', row: 'venue-endgame-score-row--bronze', rim: '#c2410c', face: '#fb923c', shine: '#ffedd5', deep: '#9a3412' },
} as const

function endgameMedalRank(index: number): 1 | 2 | 3 | null {
  if (index === 0) return 1
  if (index === 1) return 2
  if (index === 2) return 3
  return null
}

function EndgameMedal({ rank }: { rank: 1 | 2 | 3 }) {
  const metal = ENDGAME_MEDALS[rank]
  const uid = `endgame-medal-${rank}`
  return (
    <svg className="venue-endgame-medal" viewBox="0 0 40 48" role="img" aria-label={metal.label}>
      <defs>
        <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metal.shine} />
          <stop offset="42%" stopColor={metal.face} />
          <stop offset="100%" stopColor={metal.deep} />
        </linearGradient>
        <linearGradient id={`${uid}-ribbon`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      <path d="M14 2 L20 14 L12 14 Z" fill={`url(#${uid}-ribbon)`} />
      <path d="M26 2 L28 14 L20 14 Z" fill={`url(#${uid}-ribbon)`} opacity="0.9" />
      <circle cx="20" cy="30" r="14" fill={`url(#${uid}-face)`} stroke={metal.rim} strokeWidth="2.2" />
      <circle cx="20" cy="30" r="10.5" fill="none" stroke={metal.shine} strokeWidth="1.1" opacity="0.55" />
      <text
        x="20"
        y="30"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontFamily="Orbitron, ui-monospace, monospace"
        fontSize="13"
        fontWeight="900"
      >
        {rank}
      </text>
    </svg>
  )
}

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
      className="venue-endgame fixed inset-0 z-[210] flex items-center justify-center overflow-hidden bg-black/78 p-[clamp(12px,2vh,28px)] backdrop-blur-md"
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
        className="venue-bust-overlay-panel venue-endgame-panel relative z-10 flex h-[94vh] w-[min(120rem,96vw)] flex-col items-stretch overflow-hidden"
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
            <p className="venue-endgame-stack">
              <ChipText text={formatVenueBankroll(winner.bankroll)} />
            </p>
          </div>
        </div>
        {scores.length > 0 ? (
          <div className="venue-endgame-scores min-h-0 flex-1">
            <p className="venue-endgame-scores-title">Trivia scores</p>
            <ol className="venue-endgame-score-list">
              {scores.map((score, index) => {
                const medal = endgameMedalRank(index)
                return (
                <li
                  key={`${score.name}-${index}`}
                  className={medal ? `venue-endgame-score-row ${ENDGAME_MEDALS[medal].row}` : 'venue-endgame-score-row'}
                >
                  {medal ? <EndgameMedal rank={medal} /> : <span className="venue-endgame-score-rank">{index + 1}</span>}
                  <span className="venue-endgame-score-name">
                    {formatVenueDisplayPlayerName(score.name) || score.name}
                  </span>
                  <span className="venue-endgame-score-points">{formatVenueTriviaPoints(score.answerPoints)}</span>
                </li>
                )
              })}
            </ol>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
