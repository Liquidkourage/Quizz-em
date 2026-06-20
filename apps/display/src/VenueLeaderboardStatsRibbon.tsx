import type { ReactNode } from 'react'
import { PokerChip } from '@qhe/ui'
import { formatVenueBankroll, type VenueLeaderboardFooterStats } from './venueLeaderboard'

type VenueLeaderboardStatsRibbonProps = {
  stats: VenueLeaderboardFooterStats
}

function StatBlock({
  label,
  children,
  icon,
}: {
  label: string
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 sm:px-3">
      {icon ? <span className="shrink-0 text-amber-400/75">{icon}</span> : null}
      <div className="min-w-0 truncate text-center sm:text-left">
        <div className="venue-lb-stat-label uppercase tracking-wide text-amber-200/75">{label}</div>
        <div className="venue-lb-stat-value truncate font-semibold text-white/95">{children}</div>
      </div>
    </div>
  )
}

export default function VenueLeaderboardStatsRibbon({ stats }: VenueLeaderboardStatsRibbonProps) {
  return (
    <footer className="venue-lb-ribbon shrink-0 border-t border-amber-600/30 bg-gradient-to-r from-black/70 via-slate-950/85 to-black/70 px-3 py-2.5 sm:px-5 sm:py-3">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-stretch justify-center gap-y-2 sm:flex-nowrap sm:gap-y-0">
        <StatBlock label="Top stack">
          <span className="text-white/95">{stats.topName}</span>{' '}
          <span className="font-mono tabular-nums text-emerald-400">{formatVenueBankroll(stats.topStack)}</span>
        </StatBlock>
        <span className="hidden w-px self-stretch bg-amber-700/25 sm:block" aria-hidden />
        <StatBlock label="Average stack" icon={<PokerChip size="sm" className="text-lg" />}>
          <span className="font-mono tabular-nums text-emerald-400">{formatVenueBankroll(stats.averageStack)}</span>
        </StatBlock>
        <span className="hidden w-px self-stretch bg-amber-700/25 sm:block" aria-hidden />
        <StatBlock label="Median stack">
          <span className="font-mono tabular-nums text-emerald-400">{formatVenueBankroll(stats.medianStack)}</span>
        </StatBlock>
        <span className="hidden w-px self-stretch bg-amber-700/25 sm:block" aria-hidden />
        <StatBlock label="Active tables">
          <span className="font-mono tabular-nums text-white/90">{stats.liveTables}</span>
        </StatBlock>
      </div>
    </footer>
  )
}
