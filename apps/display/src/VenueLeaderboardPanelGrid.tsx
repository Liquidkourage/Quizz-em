import type { CSSProperties } from 'react'
import crownImg from './assets/showdown/crown.png'
import {
  formatVenueBankroll,
  formatVenueStackDelta,
  type VenueLeaderboardRow,
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

function PodiumEmblem({ rank }: { rank: 2 | 3 }) {
  return (
    <span className={`venue-lb-podium-badge venue-lb-podium-badge--${rank}`} aria-hidden>
      {rank}
    </span>
  )
}

type RowProps = {
  row: VenueLeaderboardRow
  rank: number
  zebra: boolean
  podium: boolean
}

function LeaderboardRankRow({ row, rank, zebra, podium }: RowProps) {
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
    <div className={rowClass}>
      <span className={`venue-lb-row-rank-cell ${rankClass}`}>
        {tier === 1 ? (
          <img src={crownImg} alt="" className="venue-lb-crown-icon" draggable={false} />
        ) : null}
        {tier === 2 ? <PodiumEmblem rank={2} /> : null}
        {tier === 3 ? <PodiumEmblem rank={3} /> : null}
        <span className="venue-lb-row-rank-num">{rank}</span>
      </span>
      <span className={`venue-lb-row-name-cell ${nameClass}`}>
        {given}
        {suffix ? <span className="venue-lb-row-suffix"> {suffix}</span> : null}
      </span>
      {row.stackDelta != null && row.stackDelta !== 0 ? (
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
      <span className={`venue-lb-row-stack-cell ${stackClass}`}>{formatVenueBankroll(row.bankroll)}</span>
    </div>
  )
}

function columnGridStyle(
  column: VenueLeaderboardColumnModel,
  podiumColumn: boolean,
  fullField: boolean
): CSSProperties {
  const rows = Math.max(1, column.gridRowCount)

  if (!podiumColumn || rows < 4) {
    return {
      ['--lb-rows' as string]: rows,
      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    }
  }

  const top = fullField ? '1.36fr' : '1.58fr'
  const second = fullField ? '1.22fr' : '1.42fr'
  const third = fullField ? '1.12fr' : '1.28fr'

  return {
    ['--lb-rows' as string]: rows,
    gridTemplateRows: `minmax(0, ${top}) minmax(0, ${second}) minmax(0, ${third}) repeat(${Math.max(0, rows - 3)}, minmax(0, 1fr))`,
  }
}

function LeaderboardColumnPanel({
  column,
  colIndex,
  showTopThreePodium,
  fullField,
}: {
  column: VenueLeaderboardColumnModel
  colIndex: number
  showTopThreePodium: boolean
  fullField: boolean
}) {
  const podiumColumn = showTopThreePodium && colIndex === 0
  const accentClass = `venue-lb-panel--accent-${Math.min(colIndex, 3)}`

  return (
    <article className={`venue-lb-panel ${accentClass} flex min-h-0 min-w-0 flex-col overflow-hidden`}>
      <header className="venue-lb-column-header">{venueLeaderboardColumnRangeLabel(column)}</header>
      <div
        className="@container/size venue-lb-column-grid grid min-h-0 flex-1 overflow-hidden"
        style={columnGridStyle(column, podiumColumn, fullField)}
      >
        {column.players.map((player, rowIndex) => (
          <LeaderboardRankRow
            key={`${player.tableNum}-${player.seatNum}-${player.name}`}
            row={player}
            rank={player.rank}
            zebra={rowIndex % 2 === 0}
            podium={podiumColumn && player.rank <= 3}
          />
        ))}
      </div>
    </article>
  )
}

type VenueLeaderboardPanelGridProps = {
  page: VenueLeaderboardPageModel
  fullField?: boolean
}

export default function VenueLeaderboardPanelGrid({ page, fullField = false }: VenueLeaderboardPanelGridProps) {
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
            fullField={fullField}
          />
        ))}
      </div>
    </div>
  )
}
