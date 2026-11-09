import { ChipText } from '@qhe/ui'
import { formatVenueBankroll, type VenueLeaderboardFooterStats } from './venueLeaderboard'

type VenueLeaderboardStatsRibbonProps = {
  stats: VenueLeaderboardFooterStats
}

function tableCountLabel(count: number): string {
  return count === 1 ? '1 table' : `${count} tables`
}

/** A quiet line under the chip ranking. The names stay the screen. */
export default function VenueLeaderboardStatsRibbon({ stats }: VenueLeaderboardStatsRibbonProps) {
  return (
    <p className="venue-lb-footnote shrink-0">
      <span>Median </span>
      <span className="venue-lb-footnote-amount">
        <ChipText text={formatVenueBankroll(stats.medianStack)} />
      </span>
      <span className="venue-lb-footnote-sep" aria-hidden>
        {' · '}
      </span>
      <span>{tableCountLabel(stats.liveTables)}</span>
    </p>
  )
}
