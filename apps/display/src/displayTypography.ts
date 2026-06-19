/**
 * Public display typography.
 * @see .cursor/rules/display-typography.mdc
 *
 * PRIMARY / SECONDARY → full-viewport bands only (headline, question strip).
 * *_CQ / *_CQW / BADGE_CQ / DENSE_CQ → inside @container cells (tiles, panels, rosters).
 */

/** Full-viewport primary (~10vh). */
export const DISPLAY_TEXT_PRIMARY = 'display-text-primary leading-tight'

/** Full-viewport secondary (≥ 5vh). */
export const DISPLAY_TEXT_SECONDARY = 'display-text-secondary leading-tight'

/** Venue mosaic headline strip (question, countdown banner). */
export const DISPLAY_TEXT_HEADLINE = 'display-text-headline leading-tight'

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
