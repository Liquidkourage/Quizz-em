import type { CSSProperties } from 'react'
import type { ShowdownStageArtLayout } from './showdownStageArtLayout'

/**
 * Trophy-relative slot anchors for the winner-stage overlay.
 *
 * All Y positions are % from the top of `.vfd-showdown-stage-zoom-frame` (same
 * coordinate space as `apps/display/public/winner-stage-preview.html`).
 *
 * Art landmarks (landscape master, 120% zoom frame):
 * - Crown base ~12%
 * - Name band 23–28%
 * - Pot center 40%
 * - Card row 50.5%
 * - Pedestal nameplate 86.2%
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

export function showdownStageSlotRubric(
  layout: ShowdownStageArtLayout
): ShowdownStageSlotRubric {
  return layout === 'portrait'
    ? SHOWDOWN_STAGE_RUBRIC_PORTRAIT
    : SHOWDOWN_STAGE_RUBRIC_LANDSCAPE
}

/** CSS custom properties consumed by `.vfd-showdown-stage-slot--*` rules. */
export function showdownStageRubricStyle(
  layout: ShowdownStageArtLayout
): CSSProperties {
  const r = showdownStageSlotRubric(layout)
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
