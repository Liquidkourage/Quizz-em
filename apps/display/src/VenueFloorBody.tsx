import { motion } from 'framer-motion'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import type { VenueFloorFormFactor } from './venueFloorFormFactor'
import { venueFloorFormFactorBodyKey } from './venueFloorFormFactor'
import {
  VenueAerialFloorGrid,
  VenueDualTableBroadcast,
  VenueHeroSpotlightLayout,
  VenueSingleTableBroadcast,
} from './VenueEightTablesPreview'

export type VenueFloorBodyProps = {
  formFactor: VenueFloorFormFactor | null
  floorTiles: readonly DisplayVenueTileSnapshot[]
  showHeroSpotlight: boolean
  hostFocusTable: number | null
  featuredTile: DisplayVenueTileSnapshot | null
  companionTiles: readonly DisplayVenueTileSnapshot[]
  floorLayoutTableCount: number
  showHeadline: boolean
  skipMountIntro: boolean
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
}

export function resolveVenueFloorBodyKey(
  formFactor: VenueFloorFormFactor | null,
  opts: { showHeroSpotlight: boolean; hostFocusTable: number | null }
): string {
  return formFactor != null
    ? venueFloorFormFactorBodyKey(formFactor, opts)
    : 'floor-empty'
}

/**
 * Form-factor switch for the venue floor body (broadcast, spotlight, mosaic).
 * Renderers live in VenueEightTablesPreview until seat-ring extraction lands.
 */
export function VenueFloorBody({
  formFactor,
  floorTiles,
  showHeroSpotlight,
  featuredTile,
  companionTiles,
  floorLayoutTableCount,
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
      {formFactor?.id === 'broadcast-1' ? (
        <VenueSingleTableBroadcast
          tile={floorTiles[0]!}
          formFactor={formFactor}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : formFactor?.id === 'broadcast-2' ? (
        <VenueDualTableBroadcast
          tiles={[...floorTiles]}
          formFactor={formFactor}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : showHeroSpotlight && featuredTile != null ? (
        <VenueHeroSpotlightLayout
          featured={featuredTile}
          companions={[...companionTiles]}
          layoutTableCount={floorLayoutTableCount}
          skipMountIntro={skipMountIntro}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <VenueAerialFloorGrid
            tiles={[...floorTiles]}
            layoutTableCount={floorLayoutTableCount}
            showHeadline={showHeadline}
            skipMountIntro={skipMountIntro}
            prefersReducedMotion={prefersReducedMotion}
            sharedShowdownAnswer={sharedShowdownAnswer}
            formFactor={formFactor ?? undefined}
          />
        </div>
      )}
    </motion.div>
  )
}
