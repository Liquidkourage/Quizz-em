import type { CSSProperties } from 'react'
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

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2 17l2.5-9.5L9 11l3-8 3 8 4.5-3.5L21 17H2zm1 2h18v2H3v-2z" />
    </svg>
  )
}

function PodiumEmblem({ rank }: { rank: 2 | 3 }) {
  const tone =
    rank === 2
      ? 'border-slate-200/70 bg-gradient-to-b from-slate-300/35 to-slate-500/25 text-slate-50 shadow-[0_0_10px_rgba(148,163,184,0.25)]'
      : 'border-orange-300/65 bg-gradient-to-b from-orange-400/35 to-orange-700/30 text-orange-50 shadow-[0_0_10px_rgba(251,146,60,0.2)]'
  return (
    <span
      className={`inline-flex h-[1.15em] w-[1.15em] shrink-0 items-center justify-center rounded-full border-2 font-mono text-[0.58em] font-black leading-none ${tone}`}
      aria-hidden
    >
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

  const shell =
    tier === 1
      ? 'venue-lb-podium-1 border border-amber-400/55 bg-gradient-to-r from-amber-900/70 via-yellow-950/45 to-amber-950/40 shadow-[inset_0_0_28px_rgba(251,191,36,0.12)]'
      : tier === 2
        ? 'venue-lb-podium-2 border border-slate-300/40 bg-gradient-to-r from-slate-700/50 via-slate-900/45 to-slate-950/40'
        : tier === 3
          ? 'venue-lb-podium-3 border border-orange-500/45 bg-gradient-to-r from-orange-900/55 via-amber-950/40 to-slate-950/35'
          : zebra
            ? 'bg-white/[0.045]'
            : 'bg-black/15'

  const rankClass = tier > 0 ? 'venue-lb-row-rank-top' : 'venue-lb-row-rank'
  const nameClass = tier > 0 ? 'venue-lb-row-name-top' : 'venue-lb-row-name'
  const stackClass = tier > 0 ? 'venue-lb-row-stack-top' : 'venue-lb-row-stack'

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 items-center gap-2.5 px-3 leading-none ${shell} ${
        tier > 0 ? 'venue-lb-podium-row' : 'venue-lb-standard-row border-b border-white/[0.05]'
      }`}
    >
      <span className={`flex w-[2.1em] shrink-0 items-center justify-end gap-1 ${rankClass}`}>
        {tier === 1 ? <CrownIcon className="h-[1.05em] w-[1.05em] shrink-0 text-amber-300" /> : null}
        {tier === 2 ? <PodiumEmblem rank={2} /> : null}
        {tier === 3 ? <PodiumEmblem rank={3} /> : null}
        <span
          className={`font-mono font-black tabular-nums ${
            tier === 1
              ? 'text-amber-100'
              : tier === 2
                ? 'text-slate-100'
                : tier === 3
                  ? 'text-orange-100'
                  : 'text-amber-300/90'
          }`}
        >
          {rank}
        </span>
      </span>
      <span className={`min-w-0 flex-1 truncate font-semibold text-white/95 ${nameClass}`}>
        {given}
        {suffix ? <span className="font-medium text-amber-100/40"> {suffix}</span> : null}
      </span>
      {row.stackDelta != null && row.stackDelta !== 0 ? (
        <span
          className={`${rankClass} shrink-0 font-black leading-none ${
            row.stackDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
          title={formatVenueStackDelta(row.stackDelta)}
          aria-hidden
        >
          {row.stackDelta > 0 ? '▲' : '▼'}
        </span>
      ) : (
        <span className={`${rankClass} w-[0.85em] shrink-0`} aria-hidden />
      )}
      <span className={`shrink-0 font-mono font-bold tabular-nums text-emerald-400 ${stackClass}`}>
        {formatVenueBankroll(row.bankroll)}
      </span>
    </div>
  )
}

function columnGridStyle(column: VenueLeaderboardColumnModel, podiumColumn: boolean): CSSProperties {
  const rows = column.gridRowCount
  const filled = column.players.length
  /** Sparse columns (e.g. after bad pagination) must not stretch one row to full viewport height. */
  const stretchRows = filled >= 8
  const rowTrack = stretchRows ? 'minmax(0, 1fr)' : 'auto'

  if (!podiumColumn) {
    return {
      ['--lb-rows' as string]: rows,
      gridTemplateRows: `repeat(${rows}, ${rowTrack})`,
      alignContent: stretchRows ? undefined : 'start',
    }
  }
  if (!stretchRows) {
    return {
      ['--lb-rows' as string]: rows,
      gridTemplateRows: `repeat(${rows}, auto)`,
      alignContent: 'start',
    }
  }
  return {
    ['--lb-rows' as string]: rows,
    gridTemplateRows: `minmax(0, 1.42fr) minmax(0, 1.32fr) minmax(0, 1.24fr) repeat(${Math.max(0, rows - 3)}, minmax(0, 1fr))`,
  }
}

function LeaderboardColumnPanel({
  column,
  colIndex,
  showTopThreePodium,
}: {
  column: VenueLeaderboardColumnModel
  colIndex: number
  showTopThreePodium: boolean
}) {
  const podiumColumn = showTopThreePodium && colIndex === 0

  return (
    <article className="venue-lb-panel flex min-h-0 min-w-0 flex-col overflow-hidden">
      <header className="venue-lb-column-header shrink-0 border-b border-amber-600/25 bg-black/40 py-1.5 text-center text-amber-200/80">
        {venueLeaderboardColumnRangeLabel(column)}
      </header>
      <div
        className="@container/size grid min-h-0 flex-1 overflow-hidden"
        style={columnGridStyle(column, podiumColumn)}
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
}

export default function VenueLeaderboardPanelGrid({ page }: VenueLeaderboardPanelGridProps) {
  const centered = page.columnCount < LEADERBOARD_MAX_COLUMNS
  const widthPct = page.columnCount === 1 ? 42 : page.columnCount === 2 ? 68 : page.columnCount === 3 ? 86 : 100

  return (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden px-1 sm:px-2">
      <div
        className="grid h-full min-h-0 gap-3 sm:gap-3.5"
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
          />
        ))}
      </div>
    </div>
  )
}
