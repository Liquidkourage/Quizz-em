import { Fragment } from 'react'
import type { ShowdownResultRow } from './showdownDisplay'

export type ShowdownChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'floor'

type DigitChipVariant = 'hole' | 'board' | 'inactive'

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
      ? 'h-[clamp(1.15rem,15cqw,2rem)] min-w-[clamp(1.15rem,15cqw,2rem)] border-2 px-[0.08em] text-[clamp(1rem,12.5cqw,1.7rem)] shadow-[0_0_10px_rgba(0,0,0,0.5)]'
      : size === 'lg'
        ? 'h-9 min-w-[1.65rem] px-1 text-base sm:h-10 sm:min-w-[1.85rem] sm:text-lg'
        : size === 'xs'
          ? 'h-5 min-w-[0.95rem] px-0.5 text-[0.55rem]'
          : size === 'sm'
            ? 'h-6 min-w-[1.125rem] px-0.5 text-[0.65rem]'
            : 'h-7 min-w-[1.35rem] px-1 text-xs'
  const styles: Record<DigitChipVariant, string> = {
    hole: 'border-amber-400/85 bg-amber-950/90 text-amber-50 shadow-[0_0_8px_rgba(251,191,36,0.35)]',
    board:
      'border-emerald-400/70 bg-emerald-950/90 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
    inactive: 'border-white/12 bg-black/35 text-white/30',
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded border font-mono font-black tabular-nums ${dim} ${styles[variant]}`}
    >
      {digit}
    </span>
  )
}

/** Decimal point glyph that sits between two digit chips (sized to match). */
function DecimalDot({ size = 'md' }: { size?: ShowdownChipSize }) {
  const dim =
    size === 'floor'
      ? 'h-[clamp(1.15rem,15cqw,2rem)] w-[0.22em] text-[clamp(1rem,12.5cqw,1.7rem)]'
      : size === 'lg'
        ? 'h-9 w-3 text-2xl sm:h-10 sm:w-4 sm:text-3xl'
        : size === 'xs'
          ? 'h-5 w-1.5 text-sm'
          : size === 'sm'
            ? 'h-6 w-2 text-base'
            : 'h-7 w-2.5 text-lg'
  return (
    <span
      aria-hidden
      className={`inline-flex items-end justify-center font-mono font-black leading-none text-amber-200 ${dim}`}
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
      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white/30">Folded</span>
    )
  }

  const cards = row.answerCards

  if (cards.length === 0) {
    return <span className="text-[0.6rem] text-white/35">—</span>
  }

  const decimalAfter = decimalLeadingDigitCount(
    cards.map((c) => c.digit),
    row.submitted
  )

  const wrapClass =
    size === 'floor'
      ? 'flex w-full max-w-full flex-nowrap items-center justify-center gap-[clamp(0.12rem,0.85cqw,0.32rem)]'
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
