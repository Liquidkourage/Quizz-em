import { Fragment } from 'react'
import { clsx } from 'clsx'
import { CardFaceGraphic } from '@qhe/ui'
import type { ShowdownResultRow } from './showdownDisplay'

export type ShowdownChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'floor' | 'floor-compact'

type DigitChipVariant = 'hole' | 'board' | 'inactive'

const shellClassBySize: Record<ShowdownChipSize, string> = {
  floor: 'h-[clamp(2.35rem,30cqw,4rem)] w-[clamp(1.55rem,20cqw,2.65rem)] shrink-0',
  'floor-compact': 'h-[clamp(1.85rem,22.5cqw,3.1rem)] w-[clamp(1.22rem,15cqw,2.05rem)] shrink-0',
  lg: 'h-9 w-[1.65rem] shrink-0 sm:h-10 sm:w-[1.85rem]',
  md: 'h-7 w-[1.35rem] shrink-0',
  sm: 'h-6 w-[1.125rem] shrink-0',
  xs: 'h-5 w-[0.95rem] shrink-0',
}

const decimalDotClassBySize: Record<ShowdownChipSize, string> = {
  floor: 'h-[clamp(0.28rem,1.85cqw,0.44rem)] w-[clamp(0.28rem,1.85cqw,0.44rem)]',
  'floor-compact': 'h-[clamp(0.22rem,1.45cqw,0.36rem)] w-[clamp(0.22rem,1.45cqw,0.36rem)]',
  lg: 'h-1.5 w-1.5 sm:h-[0.42rem] sm:w-[0.42rem]',
  md: 'h-[0.34rem] w-[0.34rem]',
  sm: 'h-[0.28rem] w-[0.28rem]',
  xs: 'h-[0.22rem] w-[0.22rem]',
}

function DigitChip({
  digit,
  variant,
  size = 'md',
}: {
  digit: number
  variant: DigitChipVariant
  size?: ShowdownChipSize
}) {
  return (
    <div className={shellClassBySize[size]}>
      <CardFaceGraphic
        digit={digit}
        dimmed={variant === 'inactive'}
        className="block h-full w-full"
        alt={`${digit}`}
      />
    </div>
  )
}

/** Gold decimal marker between two digit tiles (matches winner comp). */
function DecimalDot({ size = 'md' }: { size?: ShowdownChipSize }) {
  return (
    <span
      aria-hidden
      className={clsx('inline-flex shrink-0 items-center justify-center', shellClassBySize[size])}
    >
      <span className={clsx('vfd-showdown-winner-decimal', decimalDotClassBySize[size])} />
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
      ? 'flex w-full max-w-full flex-nowrap items-center justify-center gap-[clamp(0.15rem,1.1cqw,0.42rem)]'
      : size === 'floor-compact'
        ? 'flex w-full max-w-full flex-nowrap items-center justify-center gap-[clamp(0.12rem,0.9cqw,0.34rem)]'
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
