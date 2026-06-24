/**
 * Public display typography.
 * @see .cursor/rules/display-typography.mdc
 *
 * **Venue eagle-eye wall (mosaic + headline):** mosaic tiles use `--vfd-*` from
 * {@link venueMosaicTileTypographyStyle}; headline strip uses `display-text-headline-*` vmin clamps.
 *
 * PRIMARY / SECONDARY → full-viewport bands only (headline, question strip).
 * *_CQ / *_CQW / BADGE_CQ / DENSE_CQ → inside @container cells (tiles, panels, rosters).
 */

import type { VenueFloorPublicTypographyTier } from './venueFloorGridLayout'

/** Full-viewport primary (~10vh). */
export const DISPLAY_TEXT_PRIMARY = 'display-text-primary leading-tight'

/** Full-viewport secondary (≥ 5vh). */
export const DISPLAY_TEXT_SECONDARY = 'display-text-secondary leading-tight'

/** Venue mosaic headline strip (question, countdown banner). */
export const DISPLAY_TEXT_HEADLINE = 'display-text-headline leading-tight'

/** Headline strip — table/phase badges and setlist chips. */
export const DISPLAY_TEXT_HEADLINE_BADGE = 'display-text-headline-badge leading-none'

/** Headline strip — setlist question counter pill. */
export const DISPLAY_TEXT_HEADLINE_SETLIST_BADGE =
  'display-text-headline-setlist-badge leading-none'

/** Headline condense stats — raw numbers only (no progress bar). */
export const DISPLAY_TEXT_HEADLINE_STATS = 'display-text-headline-stats leading-tight'

/** Headline condense stats on dense floors (14+ tables). */
export const DISPLAY_TEXT_HEADLINE_STATS_COMPACT =
  'display-text-headline-stats-compact leading-tight'

export function displayHeadlineStatsClass(denseHeadline = false): string {
  return denseHeadline ? DISPLAY_TEXT_HEADLINE_STATS_COMPACT : DISPLAY_TEXT_HEADLINE_STATS
}

/** Headline strip — secondary lines (divergence, blinds meta, waiting). */
export const DISPLAY_TEXT_HEADLINE_META = 'display-text-headline-meta leading-tight'

/** Headline strip — condense progress caption. */
export const DISPLAY_TEXT_HEADLINE_CAPTION = 'display-text-headline-caption leading-tight'

export const DISPLAY_TEXT_HEADLINE_CAPTION_SPACIOUS =
  'display-text-headline-caption-spacious leading-tight'

export const DISPLAY_TEXT_HEADLINE_CAPTION_COMPACT =
  'display-text-headline-caption-compact leading-tight'

/** Dense venue headline (14+ tables) — tighter condense caption. */
export const DISPLAY_TEXT_HEADLINE_CAPTION_DENSE =
  'display-text-headline-caption-dense leading-tight'

export const DISPLAY_TEXT_HEADLINE_BLINDS_SPACIOUS =
  'vfd-headline-blinds-amount-spacious leading-none'

export const DISPLAY_TEXT_HEADLINE_BLINDS = 'vfd-headline-blinds-amount leading-none'

export const DISPLAY_TEXT_HEADLINE_BLINDS_COMPACT =
  'vfd-headline-blinds-amount-compact leading-none'

export const DISPLAY_TEXT_HEADLINE_BLINDS_DENSE =
  'vfd-headline-blinds-amount-dense leading-none'

/** Venue headline question — spacious floor (1–8 tables). */
export const DISPLAY_TEXT_HEADLINE_QUESTION_SPACIOUS =
  'display-text-headline-question-spacious leading-snug'

/** Venue headline question — standard floor (9–15 tables). */
export const DISPLAY_TEXT_HEADLINE_QUESTION_COMPACT =
  'display-text-headline-question-compact leading-snug'

/** Venue headline question — compact floor (16–20 tables). */
export const DISPLAY_TEXT_HEADLINE_QUESTION_ULTRA =
  'display-text-headline-question-ultra leading-snug'

/** Venue headline question — dense mosaic (14+ tables). */
export const DISPLAY_TEXT_HEADLINE_QUESTION_DENSE =
  'display-text-headline-question-dense leading-snug'

/** Headline blinds panel — always room-readable (not mosaic tier). */
export const DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_LABEL =
  'display-text-headline-blinds-label leading-none'

export const DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_AMOUNT =
  'vfd-headline-blinds-amount-headline leading-none'

export const DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_META =
  'display-text-headline-blinds-meta-headline leading-tight'

/** Headline phase / round status chip. */
export const DISPLAY_TEXT_HEADLINE_PHASE_BADGE =
  'display-text-headline-phase-badge leading-none'

export function displayHeadlineQuestionClass(tier: VenueFloorPublicTypographyTier): string {
  if (tier === 'spacious') return DISPLAY_TEXT_HEADLINE_QUESTION_SPACIOUS
  if (tier === 'standard') return DISPLAY_TEXT_HEADLINE_QUESTION_COMPACT
  return DISPLAY_TEXT_HEADLINE_QUESTION_ULTRA
}

export function displayHeadlineCaptionClass(
  tier: VenueFloorPublicTypographyTier,
  denseHeadline = false
): string {
  if (denseHeadline) return DISPLAY_TEXT_HEADLINE_CAPTION_DENSE
  if (tier === 'spacious') return DISPLAY_TEXT_HEADLINE_CAPTION_SPACIOUS
  if (tier === 'standard') return DISPLAY_TEXT_HEADLINE_CAPTION
  return DISPLAY_TEXT_HEADLINE_CAPTION_COMPACT
}

export function displayHeadlineBlindsAmountClass(
  tier: VenueFloorPublicTypographyTier,
  denseHeadline = false
): string {
  if (denseHeadline) return DISPLAY_TEXT_HEADLINE_BLINDS_DENSE
  if (tier === 'spacious') return DISPLAY_TEXT_HEADLINE_BLINDS_SPACIOUS
  if (tier === 'standard') return DISPLAY_TEXT_HEADLINE_BLINDS
  return DISPLAY_TEXT_HEADLINE_BLINDS_COMPACT
}

/** @container — primary (~10cqh of the cell). */
export const DISPLAY_TEXT_PRIMARY_CQ = 'display-text-primary-cq leading-tight'

/** @container — secondary (≥ 5cqh of the cell). */
export const DISPLAY_TEXT_SECONDARY_CQ = 'display-text-secondary-cq leading-tight'

/** @container width — scales with cell width. */
export const DISPLAY_TEXT_PRIMARY_CQW = 'display-text-primary-cqw leading-tight'

/** @container width — scales with cell width. */
export const DISPLAY_TEXT_SECONDARY_CQW = 'display-text-secondary-cqw leading-tight'

/** Seat markers and compact numerals inside @container cells. */
export const DISPLAY_TEXT_BADGE_CQ = 'display-text-badge-cq leading-none'

/** Multi-row lists inside a tall @container (gutter rosters, tips bullets). */
export const DISPLAY_TEXT_DENSE_CQ = 'display-text-dense-cq leading-tight'

/** Pairing gate — moderate scale; not full 10vh/5vh viewport bands (2.5× TV room scale). */
export const DISPLAY_TEXT_PAIRING_LABEL = 'display-text-pairing-label leading-tight'

export const DISPLAY_TEXT_PAIRING_TITLE = 'display-text-pairing-title leading-tight'

export const DISPLAY_TEXT_PAIRING_BODY = 'display-text-pairing-body leading-relaxed'

export const DISPLAY_TEXT_PAIRING_CODE = 'display-text-pairing-code leading-none'

/** Audience welcome wall — ~75% of default @container scale (fits URL + tips without scroll). */
export const DISPLAY_TEXT_WELCOME_PRIMARY_CQ = 'display-text-welcome-primary-cq leading-tight'

export const DISPLAY_TEXT_WELCOME_SECONDARY_CQ = 'display-text-welcome-secondary-cq leading-tight'

export const DISPLAY_TEXT_WELCOME_DENSE_CQ = 'display-text-welcome-dense-cq leading-tight'

export const DISPLAY_TEXT_WELCOME_URL_CQW = 'display-text-welcome-url-cqw leading-snug'

export const DISPLAY_TEXT_WELCOME_TIPS_CQ = 'display-text-welcome-tips-cq'

export const DISPLAY_TEXT_WELCOME_TIPS_GROUP_CQ = 'display-text-welcome-tips-group-cq'
