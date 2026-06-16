/**
 * Public display typography — all venue/TV copy must meet viewport-height floors.
 * @see .cursor/rules/display-typography.mdc
 */

/** Full-viewport primary (~10vh). */
export const DISPLAY_TEXT_PRIMARY = 'display-text-primary leading-tight'

/** Full-viewport secondary (≥ 5vh). */
export const DISPLAY_TEXT_SECONDARY = 'display-text-secondary leading-tight'

/** @container height — never below 5vh; primary targets ~10cqh when the cell is tall enough. */
export const DISPLAY_TEXT_PRIMARY_CQ = 'display-text-primary-cq leading-tight'

/** @container height — never below 5vh. */
export const DISPLAY_TEXT_SECONDARY_CQ = 'display-text-secondary-cq leading-tight'

/** @container width — never below 5vh. */
export const DISPLAY_TEXT_PRIMARY_CQW = 'display-text-primary-cqw leading-tight'

/** @container width — never below 5vh. */
export const DISPLAY_TEXT_SECONDARY_CQW = 'display-text-secondary-cqw leading-tight'

/** Seat-marker circles and other compact numeric badges inside @container cells. */
export const DISPLAY_TEXT_BADGE_CQ = 'display-text-badge-cq leading-none'
