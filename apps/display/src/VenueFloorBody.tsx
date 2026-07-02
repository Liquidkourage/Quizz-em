import { motion } from 'framer-motion'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import type { VenueFloorSpec } from './venueFloorSpec'
import { venueFloorSpecBodyKey } from './venueFloorSpec'
import {
  VenueAerialFloorGrid,
  VenueDualTableBroadcast,
  VenueHeroSpotlightLayout,
  VenueSingleTableBroadcast,
} from './VenueEightTablesPreview'

export type VenueFloorBodyProps = {
  floorSpec: VenueFloorSpec | null
  floorTiles: readonly DisplayVenueTileSnapshot[]
  showHeroSpotlight: boolean
  hostFocusTable: number | null
  featuredTile: DisplayVenueTileSnapshot | null
  companionTiles: readonly DisplayVenueTileSnapshot[]
  showHeadline: boolean
  skipMountIntro: boolean
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
}

export function resolveVenueFloorBodyKey(
  floorSpec: VenueFloorSpec | null,
  opts: { showHeroSpotlight: boolean; hostFocusTable: number | null }
): string {
  return floorSpec != null ? venueFloorSpecBodyKey(floorSpec, opts) : 'floor-empty'
}

/**
 * Form-factor switch for the venue floor body (broadcast, spotlight, mosaic).
 * Renderers live in VenueEightTablesPreview until seat-ring extraction lands.
 */
export function VenueFloorBody({
  floorSpec,
  floorTiles,
  showHeroSpotlight,
  featuredTile,
  companionTiles,
  showHeadline,
  skipMountIntro,
  prefersReducedMotion,
  sharedShowdownAnswer,
}: VenueFloorBodyProps) {
  return (
    <motion.div
      className="flex h-full min-h-0 flex-1 flex-col"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {floorSpec?.renderer === 'broadcast' && floorSpec.id === 'broadcast-1' ? (
        <VenueSingleTableBroadcast
          tile={floorTiles[0]!}
          floorSpec={floorSpec}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : floorSpec?.renderer === 'broadcast' && floorSpec.id === 'broadcast-2' ? (
        <VenueDualTableBroadcast
          tiles={[...floorTiles]}
          floorSpec={floorSpec}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : showHeroSpotlight && featuredTile != null && floorSpec != null ? (
        <VenueHeroSpotlightLayout
          featured={featuredTile}
          companions={[...companionTiles]}
          floorSpec={floorSpec}
          skipMountIntro={skipMountIntro}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : floorSpec != null ? (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <VenueAerialFloorGrid
            tiles={[...floorTiles]}
            showHeadline={showHeadline}
            skipMountIntro={skipMountIntro}
            prefersReducedMotion={prefersReducedMotion}
            sharedShowdownAnswer={sharedShowdownAnswer}
            floorSpec={floorSpec}
          />
        </div>
      ) : null}
    </motion.div>
  )
}
