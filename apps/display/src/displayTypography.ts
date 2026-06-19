/**
 * Public display typography.
 * @see .cursor/rules/display-typography.mdc
 *
 * - PRIMARY / SECONDARY → full-viewport bands (headlines, question strip, pairing screen)
 * - *_CQ / *_CQW / BADGE_CQ → text inside @container cells (mosaic tiles, felt cards)
 */

/** Full-viewport primary (~10vh). */
export const DISPLAY_TEXT_PRIMARY = 'display-text-primary leading-tight'

/** Full-viewport secondary (≥ 5vh). */
export const DISPLAY_TEXT_SECONDARY = 'display-text-secondary leading-tight'

/** @container height — ~10cqh primary, 5cqh secondary floor (relative to the cell, not the TV). */
export const DISPLAY_TEXT_PRIMARY_CQ = 'display-text-primary-cq leading-tight'

/** @container height — ≥ 5cqh within the cell. */
export const DISPLAY_TEXT_SECONDARY_CQ = 'display-text-secondary-cq leading-tight'

/** @container width — scales with cell width. */
export const DISPLAY_TEXT_PRIMARY_CQW = 'display-text-primary-cqw leading-tight'

/** @container width — scales with cell width. */
export const DISPLAY_TEXT_SECONDARY_CQW = 'display-text-secondary-cqw leading-tight'

/** Seat-marker circles and compact numerals inside @container cells. */
export const DISPLAY_TEXT_BADGE_CQ = 'display-text-badge-cq leading-none'
