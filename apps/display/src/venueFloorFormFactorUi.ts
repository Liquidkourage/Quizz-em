import type { VenueFloorFormFactor, VenueFloorFormFactorId } from './venueFloorFormFactor'

/** Typography / headline sizing input — max of populated felts and venue live table count. */
export function venueFloorLayoutTableCount(
  formFactor: VenueFloorFormFactor,
  venueLiveTableCount?: number | null
): number {
  const live =
    typeof venueLiveTableCount === 'number' && Number.isFinite(venueLiveTableCount)
      ? Math.floor(venueLiveTableCount)
      : formFactor.populatedTableCount
  return Math.max(formFactor.populatedTableCount, live)
}

export function venueFloorFormFactorUsesBroadcastHeadline(
  formFactor: VenueFloorFormFactor | null | undefined
): boolean {
  return formFactor?.headline === 'broadcast-strip'
}

export function venueFloorFormFactorUsesBroadcastUiScale(
  formFactor: VenueFloorFormFactor | null | undefined
): boolean {
  return formFactor?.uiScale === 'broadcast'
}

export function venueFloorFormFactorCompactHeadline(
  formFactor: VenueFloorFormFactor | null | undefined,
  layoutTableCount: number
): boolean {
  if (formFactor != null) {
    return (
      formFactor.id === 'wall-13-16' ||
      formFactor.id === 'wall-17-20' ||
      formFactor.id === 'wall-21-plus'
    )
  }
  return layoutTableCount >= 14
}

export function venueFloorFormFactorUltraCompactHeadline(
  formFactor: VenueFloorFormFactor | null | undefined,
  layoutTableCount: number
): boolean {
  if (formFactor != null) {
    return formFactor.id === 'wall-17-20' || formFactor.id === 'wall-21-plus'
  }
  return layoutTableCount >= 17
}

export function venueFloorFormFactorMainPaddingClass(
  formFactor: VenueFloorFormFactor | null | undefined
): string {
  return venueFloorFormFactorUsesBroadcastUiScale(formFactor) ? 'px-1 pb-0' : 'px-3 sm:px-4'
}

export function venueFloorFormFactorMainPbClass(
  formFactor: VenueFloorFormFactor | null | undefined,
  compactHeadline: boolean
): string {
  if (compactHeadline) return 'pb-0.5 sm:pb-1'
  return venueFloorFormFactorUsesBroadcastUiScale(formFactor) ? 'pb-0' : 'pb-3 sm:pb-4'
}

export function showdownStageViewportFromFormFactor(
  formFactor: VenueFloorFormFactor | null | undefined
): 'mosaic' | 'broadcast' {
  return formFactor?.showdown === 'broadcast-reveal' ? 'broadcast' : 'mosaic'
}

export function showdownLayoutTableCountFromFormFactor(
  formFactor: VenueFloorFormFactor | null | undefined,
  opts?: { broadcastColumnCount?: number; mosaicLayoutTableCount?: number }
): number {
  if (formFactor?.showdown === 'broadcast-reveal') {
    return opts?.broadcastColumnCount ?? (formFactor.id === 'broadcast-2' ? 2 : 1)
  }
  return opts?.mosaicLayoutTableCount ?? formFactor?.populatedTableCount ?? 1
}

/** CSS hook for per-tier mosaic overrides (MVP: documents tier; extend as tiers diverge). */
export function venueFloorFormFactorMosaicDensity(
  formFactor: VenueFloorFormFactor
): VenueFloorFormFactor['layoutPlan']['density'] {
  return formFactor.layoutPlan.density
}

export function venueFloorFormFactorIdLabel(id: VenueFloorFormFactorId): string {
  switch (id) {
    case 'broadcast-1':
      return 'Final table broadcast'
    case 'broadcast-2':
      return 'Dual table broadcast'
    case 'hero-3-4':
      return 'Hero mosaic (3–4 tables)'
    case 'banquet-5-8':
      return 'Banquet mosaic (5–8 tables)'
    case 'wall-9-12':
      return 'Wall mosaic (9–12 tables)'
    case 'wall-13-16':
      return 'Wall mosaic (13–16 tables)'
    case 'wall-17-20':
      return 'Wall mosaic (17–20 tables)'
    case 'wall-21-plus':
      return 'Wall mosaic (21+ tables)'
  }
}
