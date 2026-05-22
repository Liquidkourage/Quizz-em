/**
 * Venue display typography — prefer wrapping over ellipsis; shrink type only when copy is long.
 */

/** Use on labels that should wrap instead of truncating with "…". */
export const displayTextWrap = 'min-w-0 break-words hyphens-auto whitespace-normal'

export function longestTrimmedLength(values: readonly (string | null | undefined)[]): number {
  let max = 0
  for (const v of values) {
    const n = (v ?? '').trim().length
    if (n > max) max = n
  }
  return max
}

export type DisplayNamePreset =
  | 'venueSeatMd'
  | 'venueSeatLg'
  | 'venueFloorWinner'
  | 'venueSeatList'
  | 'venueRosterName'
  | 'showdownPlayerCompact'
  | 'showdownPlayerFull'
  | 'showdownWinnerBarCompact'
  | 'showdownWinnerBarFull'
  | 'showdownRailName'
  | 'venuePhasePill'

function tier(charCount: number, bounds: readonly [number, string][]): string {
  for (const [max, cls] of bounds) {
    if (charCount <= max) return cls
  }
  return bounds[bounds.length - 1]![1]
}

/** Extra size classes for long names (pair with {@link displayTextWrap}). */
export function fitDisplayNameClasses(charCount: number, preset: DisplayNamePreset): string {
  switch (preset) {
    case 'venueSeatMd':
      return tier(charCount, [
        [14, ''],
        [20, 'text-[0.625rem] sm:text-[0.6875rem]'],
        [28, 'text-[0.55rem] sm:text-[0.625rem]'],
        [Infinity, 'text-[0.5rem] sm:text-[0.55rem]'],
      ])
    case 'venueSeatLg':
      return tier(charCount, [
        [12, ''],
        [18, 'text-base sm:text-lg'],
        [24, 'text-sm sm:text-base'],
        [Infinity, 'text-xs sm:text-sm'],
      ])
    case 'venueFloorWinner':
      return tier(charCount, [
        [10, ''],
        [16, 'text-[0.5rem] sm:text-[0.6rem]'],
        [Infinity, 'text-[0.45rem] sm:text-[0.55rem]'],
      ])
    case 'venueSeatList':
      return tier(charCount, [
        [14, ''],
        [22, 'text-[0.65rem]'],
        [Infinity, 'text-[0.6rem]'],
      ])
    case 'venueRosterName':
      return tier(charCount, [
        [10, ''],
        [16, 'text-lg sm:text-xl md:text-2xl'],
        [22, 'text-base sm:text-lg md:text-xl'],
        [Infinity, 'text-sm sm:text-base md:text-lg'],
      ])
    case 'showdownPlayerCompact':
      return tier(charCount, [
        [12, ''],
        [18, 'text-[0.65rem]'],
        [Infinity, 'text-[0.6rem]'],
      ])
    case 'showdownPlayerFull':
      return tier(charCount, [
        [12, ''],
        [18, 'text-xs sm:text-sm'],
        [Infinity, 'text-[0.65rem] sm:text-xs'],
      ])
    case 'showdownWinnerBarCompact':
      return tier(charCount, [
        [18, ''],
        [32, 'text-[0.55rem]'],
        [Infinity, 'text-[0.5rem]'],
      ])
    case 'showdownWinnerBarFull':
      return tier(charCount, [
        [18, ''],
        [32, 'text-xs sm:text-sm'],
        [Infinity, 'text-[0.65rem] sm:text-xs'],
      ])
    case 'showdownRailName':
      return tier(charCount, [
        [12, ''],
        [18, 'text-xs sm:text-sm'],
        [Infinity, 'text-[0.65rem] sm:text-xs'],
      ])
    case 'venuePhasePill':
      return tier(charCount, [
        [18, ''],
        [28, 'text-[9px] sm:text-[10px]'],
        [Infinity, 'text-[8px] sm:text-[9px] leading-snug'],
      ])
    default:
      return ''
  }
}

export function fitHeadlineQuestionClasses(charCount: number): string {
  return tier(charCount, [
    [72, 'text-xs leading-snug sm:text-sm'],
    [140, 'text-[0.65rem] leading-snug sm:text-xs'],
    [Infinity, 'text-[0.6rem] leading-snug sm:text-[0.65rem]'],
  ])
}
