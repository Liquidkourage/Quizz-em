import { Fragment } from 'react'
import { clsx } from 'clsx'
import { CardFaceGraphic } from '@qhe/ui'
import type { ShowdownResultRow } from './showdownDisplay'

export type ShowdownChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'floor' | 'floor-compact' | 'stage'

type DigitChipVariant = 'hole' | 'board' | 'inactive'

/** Sized shells for official card SVGs — floor uses px mins so art reads on dense honeycomb tiles. */
const shellClassBySize: Record<ShowdownChipSize, string> = {
  floor:
    'h-[max(2.75rem,min(4.25rem,32cqw))] w-[max(1.85rem,min(2.85rem,21.5cqw))] shrink-0',
  'floor-compact':
    'h-[max(2.15rem,min(3.25rem,26cqw))] w-[max(1.42rem,min(2.15rem,17.5cqw))] shrink-0',
  stage:
    'h-[max(1.78rem,min(3rem,22.25cqw))] w-[max(1.24rem,min(2.04rem,15.5cqw))] shrink-0',
  lg: 'h-9 w-[1.65rem] shrink-0 sm:h-10 sm:w-[1.85rem]',
  md: 'h-7 w-[1.35rem] shrink-0',
  sm: 'h-[max(1.65rem,7.5cqw)] w-[max(1.05rem,5cqw)] shrink-0',
  xs: 'h-5 w-[0.95rem] shrink-0',
}

const decimalShellClassBySize: Record<ShowdownChipSize, string> = {
  floor: 'h-[max(2.75rem,min(4.25rem,32cqw))]',
  'floor-compact': 'h-[max(2.15rem,min(3.25rem,26cqw))]',
  stage: 'h-[max(1.78rem,min(3rem,22.25cqw))]',
  lg: 'h-9 sm:h-10',
  md: 'h-7',
  sm: 'h-[max(1.65rem,7.5cqw)]',
  xs: 'h-5',
}

const decimalMarkClassBySize: Record<ShowdownChipSize, string> = {
  floor: 'text-[max(0.55rem,min(0.82rem,4.2cqw))]',
  'floor-compact': 'text-[max(0.48rem,min(0.72rem,3.6cqw))]',
  stage: 'text-[min(9.5cqw,16cqh)]',
  lg: 'text-base sm:text-lg',
  md: 'text-sm',
  sm: 'text-[max(0.55rem,2.6cqw)]',
  xs: 'text-[0.45rem]',
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
        className="block h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        alt={`${digit}`}
      />
    </div>
  )
}

/** Baseline gold period between digit tiles — reads as decimal, not a divider. */
function DecimalDot({ size = 'md' }: { size?: ShowdownChipSize }) {
  const isStage = size === 'stage'
  return (
    <span
      aria-hidden
      className={clsx(
        'vfd-showdown-decimal-point inline-flex shrink-0 items-end justify-center leading-none',
        isStage
          ? 'vfd-showdown-decimal-point--stage self-end'
          : clsx(
              'w-auto min-w-0 px-0 self-end -mx-[0.14em]',
              decimalShellClassBySize[size]
            )
      )}
    >
      <span
        className={clsx(
          'vfd-showdown-decimal-mark',
          isStage ? 'vfd-showdown-decimal-mark--stage' : 'translate-y-[12%]',
          decimalMarkClassBySize[size]
        )}
      >
        .
      </span>
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
      ? 'flex w-full max-w-full flex-nowrap items-end justify-center gap-[max(0.06rem,min(0.22rem,1cqw))]'
      : size === 'floor-compact'
        ? 'flex w-full max-w-full flex-nowrap items-end justify-center gap-[max(0.05rem,min(0.18rem,0.85cqw))]'
        : size === 'stage'
          ? 'flex w-full max-w-full flex-nowrap items-end justify-center gap-[max(0.05rem,min(0.18rem,0.85cqw))]'
        : size === 'lg'
          ? 'flex flex-nowrap items-end justify-center gap-1'
          : 'flex flex-wrap items-end justify-center gap-0.5'

  const ariaLabelDigits = cards
    .map((c, i) => (i === decimalAfter ? `. ${c.digit}` : `${c.digit}`))
    .join(', ')

  return (
    <div
      className={wrapClass}
      data-showdown-winner-cards={size}
      aria-label={`Cards used: ${ariaLabelDigits}`}
    >
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
