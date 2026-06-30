import {
  formatVenueHeadlineCondensePart,
} from './venueWallModel'

/** Inline emphasis for survivor / re-seating segments in unified headline metadata. */
export function VenueHeadlineMetaPart({ part }: { part: string }) {
  const formatted = formatVenueHeadlineCondensePart(part)
  const remainingMatch = formatted.match(/^(\d+)\s+(remaining.*)$/i)
  if (remainingMatch) {
    return (
      <>
        <span className="venue-floor-headline-meta-num">{remainingMatch[1]}</span>
        <span className="venue-floor-headline-meta-muted"> {remainingMatch[2]}</span>
      </>
    )
  }

  const tablesMatch = formatted.match(/^(\d+)\s+(tables?)$/i)
  if (tablesMatch) {
    return (
      <>
        <span className="venue-floor-headline-meta-num">{tablesMatch[1]}</span>
        <span className="venue-floor-headline-meta-muted"> {tablesMatch[2]}</span>
      </>
    )
  }

  const reseatingAtMatch = formatted.match(/^Re-seating at (\d+)$/i)
  if (reseatingAtMatch) {
    return (
      <>
        <span className="venue-floor-headline-meta-muted">Re-seating at </span>
        <span className="venue-floor-headline-meta-num">{reseatingAtMatch[1]}</span>
      </>
    )
  }

  if (/^Re-seating now$/i.test(formatted)) {
    return <span className="venue-floor-headline-meta-muted">Re-seating now</span>
  }

  const combineAtMatch = formatted.match(/^Combine at (\d+)$/i)
  if (combineAtMatch) {
    return (
      <>
        <span className="venue-floor-headline-meta-muted">Combine at </span>
        <span className="venue-floor-headline-meta-num">{combineAtMatch[1]}</span>
      </>
    )
  }

  const combiningToMatch = formatted.match(/^Combining to (\d+)\s+(tables?)$/i)
  if (combiningToMatch) {
    return (
      <>
        <span className="venue-floor-headline-meta-muted">Combining to </span>
        <span className="venue-floor-headline-meta-num">{combiningToMatch[1]}</span>
        <span className="venue-floor-headline-meta-muted"> {combiningToMatch[2]}</span>
      </>
    )
  }

  return formatted
}
