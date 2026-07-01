import type { PlayerVenueBrief } from '@qhe/net'

type VenueStatusStripProps = {
  brief: PlayerVenueBrief | null
  tableBlinds?: { small: number; big: number }
}

export default function VenueStatusStrip({ brief, tableBlinds }: VenueStatusStripProps) {
  if (brief == null && tableBlinds == null) return null

  const parts: string[] = []
  if (brief?.setlistCueNumber != null && brief.setlistCueTotal != null) {
    parts.push(`Cue ${brief.setlistCueNumber}/${brief.setlistCueTotal}`)
  }
  const sb = brief?.venueSmallBlind ?? tableBlinds?.small
  const bb = brief?.venueBigBlind ?? tableBlinds?.big
  if (sb != null && bb != null) {
    parts.push(`Blinds $${sb}/$${bb}`)
  }
  if (brief?.blindLevelNumber != null && brief?.blindLevelCount != null) {
    parts.push(`Level ${brief.blindLevelNumber}/${brief.blindLevelCount}`)
  }
  if (brief?.handsUntilNextBlindLevel != null) {
    parts.push(`${brief.handsUntilNextBlindLevel} to next level`)
  }
  if (brief?.venueChipSurvivorCount != null) {
    parts.push(`${brief.venueChipSurvivorCount} in`)
  }
  if (brief?.venueLiveTableCount != null) {
    parts.push(`${brief.venueLiveTableCount} tables`)
  }
  if (brief?.venueHandsUntilShuffle != null) {
    parts.push(
      brief.venueHandsUntilShuffle === 1
        ? 'Shuffle next hand'
        : `Shuffle in ${brief.venueHandsUntilShuffle} hands`,
    )
  }

  if (parts.length === 0) return null

  return (
    <div className="mx-auto mb-4 max-w-2xl rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-center text-[11px] leading-snug text-amber-100/90 sm:text-xs">
      {parts.join(' · ')}
    </div>
  )
}
