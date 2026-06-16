import { Fragment } from 'react'
import type { ShowdownResultRow } from './showdownDisplay'
import {
  DISPLAY_TEXT_BADGE_CQ,
  DISPLAY_TEXT_PRIMARY_CQW,
  DISPLAY_TEXT_SECONDARY_CQ,
} from './displayTypography'

export type ShowdownChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'floor' | 'floor-compact'

type DigitChipVariant = 'hole' | 'board' | 'inactive'

const FLOOR_CHIP_DIM =
  'h-[clamp(2rem,26.5cqw,3.5rem)] w-[clamp(1.33rem,17.7cqw,2.33rem)] shrink-0 border-2 px-[0.06em]'
const FLOOR_COMPACT_CHIP_DIM =
  'h-[clamp(1.55rem,19.2cqw,2.7rem)] w-[clamp(1.03rem,12.8cqw,1.8rem)] shrink-0 border-2 px-[0.05em]'

function DigitChip({
  digit,
  variant,
  size = 'md',
}: {
  digit: number
  variant: DigitChipVariant
  size?: ShowdownChipSize
}) {
  const dim =
    size === 'floor'
      ? FLOOR_CHIP_DIM
      : size === 'floor-compact'
        ? FLOOR_COMPACT_CHIP_DIM
        : size === 'lg'
          ? 'h-9 w-[1.65rem] shrink-0 px-1 sm:h-10 sm:w-[1.85rem]'
          : size === 'xs'
            ? 'h-5 w-[0.95rem] shrink-0 px-0.5'
            : size === 'sm'
              ? 'h-6 w-[1.125rem] shrink-0 px-0.5'
              : 'h-7 w-[1.35rem] shrink-0 px-1'
  const textClass =
    size === 'floor' || size === 'floor-compact' || size === 'lg' || size === 'md'
      ? DISPLAY_TEXT_PRIMARY_CQW
      : DISPLAY_TEXT_BADGE_CQ
  const styles: Record<DigitChipVariant, string> = {
    hole: 'border-amber-400/85 bg-amber-950/90 text-amber-50 shadow-[0_0_8px_rgba(251,191,36,0.35)]',
    board:
      'border-emerald-400/70 bg-emerald-950/90 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
    inactive: 'border-white/12 bg-black/35 text-white/30',
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] border font-mono font-black tabular-nums leading-none ${dim} ${textClass} ${styles[variant]}`}
    >
      {digit}
    </span>
  )
}

/** Decimal point glyph that sits between two digit chips (sized to match). */
function DecimalDot({ size = 'md' }: { size?: ShowdownChipSize }) {
  const dim =
    size === 'floor'
      ? `${FLOOR_CHIP_DIM} w-[0.22em]`
      : size === 'floor-compact'
        ? `${FLOOR_COMPACT_CHIP_DIM} w-[0.2em]`
        : size === 'lg'
          ? 'h-9 w-3 sm:h-10 sm:w-4'
          : size === 'xs'
            ? 'h-5 w-1.5'
            : size === 'sm'
              ? 'h-6 w-2'
              : 'h-7 w-2.5'
  const textClass =
    size === 'floor' || size === 'floor-compact' || size === 'lg' || size === 'md'
      ? DISPLAY_TEXT_PRIMARY_CQW
      : DISPLAY_TEXT_BADGE_CQ
  return (
    <span
      aria-hidden
      className={`inline-flex items-end justify-center font-mono font-black leading-none text-amber-200 ${dim} ${textClass}`}
    >
      .
    </span>
  )
}

/**
 * Number of leading digits before the decimal point in `submitted`, given the 5 digits
 * the player picked (in order). Returns `null` for integer answers or unknown layout.
 */
function decimalLeadingDigitCount(digits: number[], submitted: number | null): number | null {
  if (submitted == null || !Number.isFinite(submitted)) return null
  if (digits.length !== 5) return null
  const intForm = Number(digits.join(''))
  if (Math.abs(submitted - intForm) < 1e-9) return null
  for (let k = 1; k <= 4; k++) {
    const scaled = submitted * Math.pow(10, k)
    if (Math.abs(scaled - intForm) < 1e-6) return 5 - k
  }
  return null
}

/** The five digits used to build this player's submitted answer (from answer composition). */
export function ShowdownFiveCardsUsed({
  row,
  size = 'sm',
}: {
  row: ShowdownResultRow
  size?: ShowdownChipSize
}) {
  if (row.hasFolded) {
    return (
      <span className={`font-bold uppercase tracking-wider text-white/30 ${DISPLAY_TEXT_SECONDARY_CQ}`}>
        Folded
      </span>
    )
  }

  const cards = row.answerCards

  if (cards.length === 0) {
    return <span className={`text-white/35 ${DISPLAY_TEXT_SECONDARY_CQ}`}>—</span>
  }

  const decimalAfter = decimalLeadingDigitCount(
    cards.map((c) => c.digit),
    row.submitted
  )

  const wrapClass =
    size === 'floor'
      ? 'flex w-full max-w-full flex-nowrap items-center justify-center gap-[clamp(0.18rem,1.25cqw,0.48rem)]'
      : size === 'floor-compact'
        ? 'flex w-full max-w-full flex-nowrap items-center justify-center gap-[clamp(0.14rem,1cqw,0.38rem)]'
        : size === 'lg'
          ? 'flex flex-nowrap items-center justify-center gap-1'
          : 'flex flex-wrap items-center justify-center gap-0.5'

  const ariaLabelDigits = cards
    .map((c, i) => (i === decimalAfter ? `. ${c.digit}` : `${c.digit}`))
    .join(', ')

  return (
    <div className={wrapClass} aria-label={`Cards used: ${ariaLabelDigits}`}>
      {cards.map((c, i) => (
        <Fragment key={i}>
          {i === decimalAfter ? <DecimalDot size={size} /> : null}
          <DigitChip
            digit={c.digit}
            variant={c.source === 'hole' ? 'hole' : 'board'}
            size={size}
          />
        </Fragment>
      ))}
    </div>
  )
}
