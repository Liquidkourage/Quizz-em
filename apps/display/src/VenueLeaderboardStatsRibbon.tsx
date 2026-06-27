import type { ReactNode } from 'react'
import { formatVenueBankroll, type VenueLeaderboardFooterStats } from './venueLeaderboard'
import {
  LeaderboardAverageIcon,
  LeaderboardMedianIcon,
  LeaderboardTablesIcon,
  LeaderboardTopStackIcon,
} from './leaderboardRibbonIcons'

type VenueLeaderboardStatsRibbonProps = {
  stats: VenueLeaderboardFooterStats
}

function StatSection({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="venue-lb-stat-section">
      <div className="venue-lb-stat-icon-wrap" aria-hidden>
        {icon}
      </div>
      <div className="venue-lb-stat-copy min-w-0">
        <div className="venue-lb-stat-label">{label}</div>
        <div className="venue-lb-stat-value">{children}</div>
      </div>
    </div>
  )
}

export default function VenueLeaderboardStatsRibbon({ stats }: VenueLeaderboardStatsRibbonProps) {
  return (
    <footer className="venue-lb-ribbon shrink-0">
      <div className="venue-lb-ribbon-inner">
        <StatSection label="Top stack" icon={<LeaderboardTopStackIcon className="venue-lb-stat-icon" />}>
          <span className="venue-lb-stat-name">{stats.topName}</span>{' '}
          <span className="venue-lb-stat-amount">{formatVenueBankroll(stats.topStack)}</span>
        </StatSection>
        <StatSection label="Average stack" icon={<LeaderboardAverageIcon className="venue-lb-stat-icon" />}>
          <span className="venue-lb-stat-amount">{formatVenueBankroll(stats.averageStack)}</span>
        </StatSection>
        <StatSection label="Median stack" icon={<LeaderboardMedianIcon className="venue-lb-stat-icon" />}>
          <span className="venue-lb-stat-amount">{formatVenueBankroll(stats.medianStack)}</span>
        </StatSection>
        <StatSection label="Active tables" icon={<LeaderboardTablesIcon className="venue-lb-stat-icon" />}>
          <span className="venue-lb-stat-count">{stats.liveTables}</span>
        </StatSection>
      </div>
    </footer>
  )
}
