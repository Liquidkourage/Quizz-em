import { Fragment } from 'react'
import { CardFaceGraphic } from '@qhe/ui'
import type { ShowdownResultRow } from './showdownDisplay'

export type ShowdownChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'floor' | 'floor-compact'

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
  void variant
  const dim =
    size === 'floor'
      ? 'h-[clamp(2rem,26.5cqw,3.5rem)] w-[clamp(1.33rem,17.7cqw,2.33rem)] shrink-0'
      : size === 'floor-compact'
        ? 'h-[clamp(1.55rem,19.2cqw,2.7rem)] w-[clamp(1.03rem,12.8cqw,1.8rem)] shrink-0'
        : size === 'lg'
          ? 'h-9 w-[1.65rem] shrink-0 sm:h-10 sm:w-[1.85rem]'
          : size === 'xs'
            ? 'h-5 w-[0.95rem] shrink-0'
            : size === 'sm'
              ? 'h-6 w-[1.125rem] shrink-0'
              : 'h-7 w-[1.35rem] shrink-0'
  return (
    <CardFaceGraphic
      digit={digit}
      dimmed={variant === 'inactive'}
      className={`rounded-[3px] shadow-sm ${dim}`}
      alt={`${digit}`}
    />
  )
}

/** Decimal point glyph that sits between two digit chips (sized to match). */
function DecimalDot({ size = 'md' }: { size?: ShowdownChipSize }) {
  const dim =
    size === 'floor'
      ? 'h-[clamp(2rem,26.5cqw,3.5rem)] w-[0.22em] text-[clamp(1.72rem,22.2cqw,3rem)]'
      : size === 'floor-compact'
        ? 'h-[clamp(1.55rem,19.2cqw,2.7rem)] w-[0.2em] text-[clamp(1.35rem,16.1cqw,2.3rem)]'
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
