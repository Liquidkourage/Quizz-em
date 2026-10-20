import type { CSSProperties } from 'react'
import { ChipText } from '@qhe/ui'
import {
  formatVenueBankroll,
  formatVenueStackDelta,
  formatVenueTriviaPoints,
  type VenueLeaderboardRow,
  type VenueLeaderboardTrophy,
} from './venueLeaderboard'
import {
  LEADERBOARD_MAX_COLUMNS,
  venueLeaderboardColumnRangeLabel,
  type VenueLeaderboardColumnModel,
  type VenueLeaderboardPageModel,
} from './venueLeaderboardPresentation'

function splitLeaderboardName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

/** Gold / silver / bronze medal for leaderboard ranks 1–3. */
function LeaderboardMedal({ rank }: { rank: 1 | 2 | 3 }) {
  const metal =
    rank === 1
      ? { rim: '#f59e0b', face: '#fbbf24', shine: '#fef3c7', deep: '#b45309' }
      : rank === 2
        ? { rim: '#94a3b8', face: '#cbd5e1', shine: '#f8fafc', deep: '#64748b' }
        : { rim: '#c2410c', face: '#fb923c', shine: '#ffedd5', deep: '#9a3412' }
  const uid = `lb-medal-${rank}`
  return (
    <svg
      className={`venue-lb-medal venue-lb-medal--${rank}`}
      viewBox="0 0 40 48"
      aria-hidden
      focusable="false"
    >
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
        fill="#0f172a"
        fontFamily="ui-monospace, monospace"
        fontSize="14"
        fontWeight="900"
      >
        {rank}
      </text>
    </svg>
  )
}

type RowProps = {
  row: VenueLeaderboardRow
  rank: number
  zebra: boolean
  podium: boolean
  trophy: VenueLeaderboardTrophy
}

function LeaderboardRankRow({ row, rank, zebra, podium, trophy }: RowProps) {
  const { given, suffix } = splitLeaderboardName(row.name)
  const tier = podium ? (rank === 1 ? 1 : rank === 2 ? 2 : rank === 3 ? 3 : 0) : 0

  const rowClass =
    tier === 1
      ? 'venue-lb-row venue-lb-row--podium venue-lb-row--podium-1'
      : tier === 2
        ? 'venue-lb-row venue-lb-row--podium venue-lb-row--podium-2'
        : tier === 3
          ? 'venue-lb-row venue-lb-row--podium venue-lb-row--podium-3'
          : `venue-lb-row venue-lb-row--standard ${zebra ? 'venue-lb-row--zebra' : ''}`

  const rankClass = tier > 0 ? 'venue-lb-row-rank-top' : 'venue-lb-row-rank'
  const nameClass = tier > 0 ? 'venue-lb-row-name-top' : 'venue-lb-row-name'
  const stackClass = tier > 0 ? 'venue-lb-row-stack-top' : 'venue-lb-row-stack'

  return (
    <div className={rowClass} aria-label={`Rank ${rank}, ${row.name}`}>
      <span className={`venue-lb-row-rank-cell ${rankClass}`}>
        {tier === 1 || tier === 2 || tier === 3 ? (
          <LeaderboardMedal rank={tier} />
        ) : (
          <span className="venue-lb-row-rank-num">{rank}</span>
        )}
      </span>
      <span className={`venue-lb-row-name-cell ${nameClass}`}>
        {given}
        {suffix ? <span className="venue-lb-row-suffix"> {suffix}</span> : null}
      </span>
      {trophy === 'chips' && row.stackDelta != null && row.stackDelta !== 0 ? (
        <span
          className={`venue-lb-row-delta ${rankClass} ${row.stackDelta > 0 ? 'venue-lb-row-delta--up' : 'venue-lb-row-delta--down'}`}
          title={formatVenueStackDelta(row.stackDelta)}
          aria-hidden
        >
          {row.stackDelta > 0 ? '▲' : '▼'}
        </span>
      ) : (
        <span className={`venue-lb-row-delta ${rankClass} venue-lb-row-delta--empty`} aria-hidden />
      )}
      <span className={`venue-lb-row-stack-cell ${stackClass}`}>
        <ChipText
          text={
            trophy === 'trivia'
              ? formatVenueTriviaPoints(row.answerPoints ?? 0)
              : formatVenueBankroll(row.bankroll)
          }
        />
      </span>
    </div>
  )
}

function columnGridStyle(column: VenueLeaderboardColumnModel): CSSProperties {
  const rows = Math.max(1, column.gridRowCount)
  return {
    ['--lb-rows' as string]: rows,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  }
}

function LeaderboardColumnPanel({
  column,
  colIndex,
  showTopThreePodium,
  trophy,
}: {
  column: VenueLeaderboardColumnModel
  colIndex: number
  showTopThreePodium: boolean
  trophy: VenueLeaderboardTrophy
}) {
  const podiumColumn = showTopThreePodium && colIndex === 0
  const accentClass = `venue-lb-panel--accent-${Math.min(colIndex, 3)}`

  return (
    <article className={`venue-lb-panel ${accentClass} flex min-h-0 min-w-0 flex-col overflow-hidden`}>
      <header className="venue-lb-column-header">{venueLeaderboardColumnRangeLabel(column)}</header>
      <div
        className="@container/size venue-lb-column-grid grid min-h-0 flex-1 overflow-hidden"
        style={columnGridStyle(column)}
      >
        {column.players.map((player, rowIndex) => (
          <LeaderboardRankRow
            key={`${player.tableNum}-${player.seatNum}-${player.name}`}
            row={player}
            rank={player.rank}
            zebra={rowIndex % 2 === 0}
            podium={podiumColumn && player.rank <= 3}
            trophy={trophy}
          />
        ))}
      </div>
    </article>
  )
}

type VenueLeaderboardPanelGridProps = {
  page: VenueLeaderboardPageModel
  trophy?: VenueLeaderboardTrophy
}

export default function VenueLeaderboardPanelGrid({
  page,
  trophy = 'chips',
}: VenueLeaderboardPanelGridProps) {
  const centered = page.columnCount < LEADERBOARD_MAX_COLUMNS
  const widthPct = page.columnCount === 1 ? 42 : page.columnCount === 2 ? 68 : page.columnCount === 3 ? 86 : 100

  return (
    <div className="venue-lb-grid-stage flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
      <div
        className="venue-lb-grid grid h-full min-h-0"
        style={{
          width: centered ? `${widthPct}%` : '100%',
          maxWidth: '100%',
          gridTemplateColumns: `repeat(${page.columns.length}, minmax(0, 1fr))`,
        }}
      >
        {page.columns.map((column, colIndex) => (
          <LeaderboardColumnPanel
            key={`${page.pageNumber}-${column.rankStart}`}
            column={column}
            colIndex={colIndex}
            showTopThreePodium={page.showTopThreePodium}
            trophy={trophy}
          />
        ))}
      </div>
    </div>
  )
}
