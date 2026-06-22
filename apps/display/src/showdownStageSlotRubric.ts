import type { CSSProperties } from 'react'
import type { ShowdownStageArtLayout } from './showdownStageArtLayout'
import { showdownStageDensityTier } from './showdownStageArtLayout'

export type { ShowdownStageDensityTier } from './showdownStageArtLayout'
export { showdownStageDensityTier } from './showdownStageArtLayout'

/**
 * Trophy-relative slot anchors for the winner-stage overlay.
 *
 * All Y positions are % from the top of `.vfd-showdown-stage-zoom-frame` (same
 * coordinate space as `apps/display/public/winner-stage-preview.html`).
 *
 * Base landscape values match the preview; {@link showdownStageDensityTier} patches
 * adjust for large 2–4-up tiles and mid-density 5–11-up floors.
 */
export type ShowdownStageSlotRubric = {
  safeTop: number
  bannerWidthInsetPct: number
  winnerNameY: number
  winnerNameWidthPct: number
  splitNameY: number
  splitNameBelowBannerY: number
  sideLedgerY: number
  sideLedgerBelowBannerY: number
  sideLedgerWidthInsetPct: number
  potY: number
  potWidthInsetPct: number
  cardsY: number
  cardsWidthPct: number
  cardsHeightPct: number
  cardsYWithSideLedger: number
  cardsWidthSidePct: number
  cardsHeightSidePct: number
  diffY: number
  diffWidthPct: number
  diffHeightPct: number
}

/** Authored against winner-stage-preview.html @ 403×241 (landscape). */
export const SHOWDOWN_STAGE_RUBRIC_LANDSCAPE: ShowdownStageSlotRubric = {
  safeTop: 9.25,
  bannerWidthInsetPct: 24,
  winnerNameY: 25,
  winnerNameWidthPct: 68,
  splitNameY: 25.4,
  splitNameBelowBannerY: 26.8,
  sideLedgerY: 27.5,
  sideLedgerBelowBannerY: 28.8,
  sideLedgerWidthInsetPct: 18,
  potY: 40,
  potWidthInsetPct: 10,
  cardsY: 50.5,
  cardsWidthPct: 84,
  cardsHeightPct: 18,
  cardsYWithSideLedger: 52.5,
  cardsWidthSidePct: 78,
  cardsHeightSidePct: 16,
  diffY: 86.2,
  diffWidthPct: 44,
  diffHeightPct: 7.5,
}

/** Portrait master — width-fill art; Y anchors nudged for taller crop. */
export const SHOWDOWN_STAGE_RUBRIC_PORTRAIT: ShowdownStageSlotRubric = {
  safeTop: 8,
  bannerWidthInsetPct: 20,
  winnerNameY: 27,
  winnerNameWidthPct: 66,
  splitNameY: 27.2,
  splitNameBelowBannerY: 28.6,
  sideLedgerY: 29.5,
  sideLedgerBelowBannerY: 30.8,
  sideLedgerWidthInsetPct: 16,
  potY: 41,
  potWidthInsetPct: 12,
  cardsY: 52,
  cardsWidthPct: 82,
  cardsHeightPct: 17,
  cardsYWithSideLedger: 54.5,
  cardsWidthSidePct: 74,
  cardsHeightSidePct: 15,
  diffY: 86.2,
  diffWidthPct: 44,
  diffHeightPct: 7.5,
}

/** Large 2–4-up tiles — slightly tighter art zoom + nudged anchors. */
const SPACIOUS_PATCH_LANDSCAPE: Partial<ShowdownStageSlotRubric> = {
  winnerNameY: 23.8,
  splitNameY: 24.2,
  splitNameBelowBannerY: 25.6,
  sideLedgerY: 26.6,
  sideLedgerBelowBannerY: 27.8,
  potY: 39.2,
  cardsY: 49.8,
  cardsYWithSideLedger: 51.2,
  diffY: 85.9,
  winnerNameWidthPct: 64,
  sideLedgerWidthInsetPct: 22,
}

const SPACIOUS_PATCH_PORTRAIT: Partial<ShowdownStageSlotRubric> = {
  winnerNameY: 25.8,
  splitNameY: 26,
  splitNameBelowBannerY: 27.2,
  sideLedgerY: 28.2,
  sideLedgerBelowBannerY: 29.4,
  potY: 39.8,
  cardsY: 50.5,
  cardsYWithSideLedger: 52.8,
  diffY: 85.8,
  winnerNameWidthPct: 62,
  sideLedgerWidthInsetPct: 20,
}

/** 5–11-up floors — ± sits a touch high on mid-size tiles. */
const STANDARD_PATCH: Partial<ShowdownStageSlotRubric> = {
  diffY: 87.6,
}

/** Main + side + return rows — compress ledger and push cards down. */
const MULTI_SIDE_LEDGER_PATCH: Partial<ShowdownStageSlotRubric> = {
  sideLedgerBelowBannerY: 27.4,
  sideLedgerY: 26.4,
  cardsYWithSideLedger: 54.8,
  cardsHeightSidePct: 14,
  sideLedgerWidthInsetPct: 24,
}

/** Per-table-count QA nudges (see venue-floor showdown layout review). */
function tableCountPatch(tableCount: number): Partial<ShowdownStageSlotRubric> | undefined {
  switch (Math.max(1, Math.floor(tableCount))) {
    case 3:
      return { diffY: 86.8, cardsY: 50.2, cardsYWithSideLedger: 52.0 }
    case 7:
      return { diffY: 88.0 }
    case 9:
      return { diffY: 88.5, cardsY: 49.5, cardsYWithSideLedger: 51.6 }
    default:
      return undefined
  }
}

function mergeRubric(
  base: ShowdownStageSlotRubric,
  ...patches: Array<Partial<ShowdownStageSlotRubric> | undefined>
): ShowdownStageSlotRubric {
  return Object.assign({}, base, ...patches.filter(Boolean))
}

export function showdownStageSlotRubric(
  layout: ShowdownStageArtLayout,
  tableCount = 14,
  sideLedgerRows = 0
): ShowdownStageSlotRubric {
  const tier = showdownStageDensityTier(tableCount)
  const base = layout === 'portrait' ? SHOWDOWN_STAGE_RUBRIC_PORTRAIT : SHOWDOWN_STAGE_RUBRIC_LANDSCAPE

  const tierPatch =
    tier === 'spacious'
      ? layout === 'portrait'
        ? SPACIOUS_PATCH_PORTRAIT
        : SPACIOUS_PATCH_LANDSCAPE
      : tier === 'standard'
        ? STANDARD_PATCH
        : undefined

  const multiSidePatch = sideLedgerRows >= 3 ? MULTI_SIDE_LEDGER_PATCH : undefined

  return mergeRubric(base, tierPatch, multiSidePatch, tableCountPatch(tableCount))
}

/** CSS custom properties consumed by `.vfd-showdown-stage-slot--*` rules. */
export function showdownStageRubricStyle(
  layout: ShowdownStageArtLayout,
  tableCount = 14,
  options?: { sideLedgerRows?: number }
): CSSProperties {
  const sideLedgerRows = options?.sideLedgerRows ?? 0
  const r = showdownStageSlotRubric(layout, tableCount, sideLedgerRows)
  const safeWidth = `calc(var(--vfd-stage-safe-width, 83.333%) - ${r.bannerWidthInsetPct}%)`
  const ledgerWidth = `calc(var(--vfd-stage-safe-width, 83.333%) - ${r.sideLedgerWidthInsetPct}%)`
  const potWidth = `calc(var(--vfd-stage-safe-width, 83.333%) - ${r.potWidthInsetPct}%)`
  const nameWidth = `calc(var(--vfd-stage-safe-width, 83.333%) * ${r.winnerNameWidthPct / 100})`

  return {
    '--vfd-stage-safe-top': `${r.safeTop}%`,
    '--vfd-stage-y-winner-name': `${r.winnerNameY}%`,
    '--vfd-stage-y-split-name': `${r.splitNameY}%`,
    '--vfd-stage-y-split-name-banner': `${r.splitNameBelowBannerY}%`,
    '--vfd-stage-y-ledger': `${r.sideLedgerY}%`,
    '--vfd-stage-y-ledger-banner': `${r.sideLedgerBelowBannerY}%`,
    '--vfd-stage-y-pot': `${r.potY}%`,
    '--vfd-stage-y-cards': `${r.cardsY}%`,
    '--vfd-stage-y-cards-side': `${r.cardsYWithSideLedger}%`,
    '--vfd-stage-y-diff': `${r.diffY}%`,
    '--vfd-stage-w-banner': safeWidth,
    '--vfd-stage-w-name': nameWidth,
    '--vfd-stage-w-ledger': ledgerWidth,
    '--vfd-stage-w-pot': potWidth,
    '--vfd-stage-w-cards': `${r.cardsWidthPct}%`,
    '--vfd-stage-h-cards': `${r.cardsHeightPct}%`,
    '--vfd-stage-w-cards-side': `${r.cardsWidthSidePct}%`,
    '--vfd-stage-h-cards-side': `${r.cardsHeightSidePct}%`,
    '--vfd-stage-w-diff': `${r.diffWidthPct}%`,
    '--vfd-stage-h-diff': `${r.diffHeightPct}%`,
  } as CSSProperties
}
