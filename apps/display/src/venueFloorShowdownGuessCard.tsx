import type { ReactNode } from 'react'
import type { VenueFloorShowdownVariantId } from './venueFloorShowdownVariants'
import { DISPLAY_TEXT_PRIMARY_CQW } from './displayTypography'

export type GuessCardTone =
  | 'amber'
  | 'gold'
  | 'cyan'
  | 'emerald'
  | 'rose'
  | 'yellow'
  | 'noir'
  | 'cream'

const GUESS_CARD_TONE: Record<GuessCardTone, string> = {
  amber: 'border-amber-400/65 bg-gradient-to-b from-amber-950/95 to-black/90',
  gold: 'border-yellow-400/60 bg-gradient-to-b from-yellow-900/90 to-amber-950/92',
  cyan: 'border-cyan-400/55 bg-gradient-to-b from-cyan-950/90 to-black/92',
  emerald: 'border-emerald-400/55 bg-gradient-to-b from-emerald-950/90 to-black/92',
  rose: 'border-rose-400/60 bg-gradient-to-b from-rose-950/90 to-black/92',
  yellow: 'border-yellow-500/60 bg-gradient-to-b from-black/85 to-amber-950/88',
  noir: 'border-white/40 bg-gradient-to-b from-neutral-900/96 to-black/96',
  cream: 'border-amber-700/50 bg-gradient-to-b from-amber-100/94 to-amber-200/90',
}

const GUESS_NUM =
  'font-mono font-black tabular-nums leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]'

export function GuessNumberCard({
  tone,
  children,
  className = '',
  size = 'md',
}: {
  tone: GuessCardTone
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const pad =
    size === 'xl'
      ? 'px-[0.65em] py-[0.5em]'
      : size === 'lg'
        ? 'px-[0.55em] py-[0.42em]'
        : size === 'sm'
          ? 'px-[0.4em] py-[0.3em]'
          : 'px-[0.5em] py-[0.38em]'
  const text = DISPLAY_TEXT_PRIMARY_CQW

  return (
    <div
      className={`rounded-xl border-2 text-center shadow-[0_6px_22px_rgba(0,0,0,0.55)] ${pad} ${GUESS_CARD_TONE[tone]} ${className}`}
    >
      <div className={`${GUESS_NUM} ${text}`}>{children}</div>
    </div>
  )
}

const VARIANT_TONE: Record<VenueFloorShowdownVariantId, GuessCardTone> = {
  8: 'amber',
}

export function WinningGuessCard({
  guess,
  variantId,
  size = 'md',
}: {
  guess: string
  variantId: VenueFloorShowdownVariantId
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const tone = VARIANT_TONE[variantId]
  const textClass =
    tone === 'cream'
      ? 'text-amber-950'
      : tone === 'rose'
        ? 'text-rose-100'
        : tone === 'cyan'
          ? 'text-cyan-100'
          : tone === 'emerald'
            ? 'text-emerald-100'
            : tone === 'yellow'
              ? 'text-yellow-300'
              : tone === 'noir'
                ? 'text-white'
                : 'text-amber-50'

  if (variantId === 8) {
    return (
      <GuessNumberCard tone="gold" size={size}>
        <span
          className={`bg-gradient-to-b from-yellow-200 via-amber-100 to-yellow-600 bg-clip-text text-transparent ${textClass}`}
        >
          {guess}
        </span>
      </GuessNumberCard>
    )
  }

  return (
    <GuessNumberCard tone={tone} size={size}>
      <span className={textClass}>{guess}</span>
    </GuessNumberCard>
  )
}
