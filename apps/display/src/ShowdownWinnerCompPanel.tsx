import { Fragment, useId, type ReactNode, type SVGAttributes } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { clsx } from 'clsx'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankrollDigits } from './venueLeaderboard'
import { ShowdownPotWinnerList, type ShowdownSidePotLine } from './venueFloorSidePotDisplay'

function ShowdownGoldDiamond({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block h-[0.45em] w-[0.45em] rotate-45 rounded-[1px] bg-gradient-to-br from-[#fff1c2] via-[#e2ad1a] to-[#8a6718] shadow-[0_0_6px_rgba(251,191,36,0.45)]',
        className
      )}
    />
  )
}

function ShowdownWinnerCrown({ className, ...props }: SVGAttributes<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const goldId = `showdown-crown-gold-${uid}`

  return (
    <svg
      viewBox="0 0 64 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={clsx('pointer-events-none select-none', className)}
      {...props}
    >
      <defs>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff1c2" />
          <stop offset="45%" stopColor="#e2ad1a" />
          <stop offset="100%" stopColor="#7a5a14" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${goldId})`}
        d="M6 30 L12 14 L20 22 L32 8 L44 22 L52 14 L58 30 Z"
      />
      <rect x="6" y="30" width="52" height="6" rx="1.5" fill={`url(#${goldId})`} />
      <circle cx="32" cy="20" r="3.2" fill="#120818" stroke="#e2ad1a" strokeWidth="1" />
      <circle cx="12" cy="24" r="2" fill="#120818" stroke="#c9a030" strokeWidth="0.8" />
      <circle cx="52" cy="24" r="2" fill="#120818" stroke="#c9a030" strokeWidth="0.8" />
    </svg>
  )
}

/** Arch laurel framing winner name + pot (matches comp). */
function ShowdownLaurelArch({ className, ...props }: SVGAttributes<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const goldId = `showdown-arch-gold-${uid}`

  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={clsx('pointer-events-none select-none', className)}
      {...props}
    >
      <defs>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff1c2" />
          <stop offset="40%" stopColor="#e2ad1a" />
          <stop offset="100%" stopColor="#8a6718" />
        </linearGradient>
      </defs>
      <g fill={`url(#${goldId})`} opacity="0.95">
        <path d="M24 170 C40 120 55 80 78 52 C68 78 58 108 50 138 C44 154 34 166 24 170 Z" />
        <path d="M34 176 C52 128 68 92 88 62 C76 88 64 118 54 148 C48 162 40 172 34 176 Z" />
        <path d="M44 182 C62 136 78 102 98 72 C86 98 74 128 64 156 C58 170 50 180 44 182 Z" />
        <path d="M276 170 C260 120 245 80 222 52 C232 78 242 108 250 138 C256 154 266 166 276 170 Z" />
        <path d="M266 176 C248 128 232 92 212 62 C224 88 236 118 246 148 C252 162 260 172 266 176 Z" />
        <path d="M256 182 C238 136 222 102 202 72 C214 98 226 128 236 156 C242 170 250 180 256 182 Z" />
        <path
          d="M78 52 C110 28 190 28 222 52"
          fill="none"
          stroke={`url(#${goldId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

function ShowdownWinnerPodium({ className, ...props }: SVGAttributes<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const navyId = `showdown-podium-navy-${uid}`
  const goldId = `showdown-podium-gold-${uid}`

  return (
    <svg
      viewBox="0 0 200 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={clsx('pointer-events-none w-full select-none', className)}
      {...props}
    >
      <defs>
        <linearGradient id={navyId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a2844" />
          <stop offset="100%" stopColor="#0a101c" />
        </linearGradient>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8a6718" />
          <stop offset="50%" stopColor="#f0d98a" />
          <stop offset="100%" stopColor="#8a6718" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="50" rx="88" ry="10" fill={`url(#${navyId})`} stroke={`url(#${goldId})`} strokeWidth="1.5" />
      <ellipse cx="100" cy="38" rx="72" ry="8" fill={`url(#${navyId})`} stroke={`url(#${goldId})`} strokeWidth="1.2" />
      <ellipse cx="100" cy="28" rx="56" ry="7" fill={`url(#${navyId})`} stroke={`url(#${goldId})`} strokeWidth="1" />
    </svg>
  )
}

function ShowdownCompPotAmount({ amount, each = false }: { amount: number; each?: boolean }) {
  const digits = formatVenueBankrollDigits(Math.max(0, Math.round(amount)))
  return (
    <div className="flex items-baseline justify-center gap-[0.35em]">
      <span
        className="vfd-mosaic-stack vfd-mosaic-dollar vfd-mosaic-dollar--live text-[clamp(1.35rem,14.5cqw,2.75rem)] leading-none"
        aria-label={`$${digits}`}
      >
        <span className="vfd-mosaic-dollar-sign" aria-hidden>
          $
        </span>
        <span className="vfd-mosaic-dollar-digits">{digits}</span>
      </span>
      {each ? (
        <span className="font-bold uppercase tracking-[0.14em] text-[#e2ad1a]/90 text-[clamp(0.62rem,5.8cqw,0.95rem)]">
          each
        </span>
      ) : null}
    </div>
  )
}

function formatWinnerDifference(
  row: ShowdownResultRow | null,
  correctAnswer: number | undefined
): string | null {
  if (row == null || correctAnswer == null || row.submitted == null) return null
  const diff = row.submitted - correctAnswer
  const sign = diff >= 0 ? '+' : '-'
  return `${sign}${formatTriviaNumber(Math.abs(diff))}`
}

function ShowdownDifferencePlaque({ value }: { value: string }) {
  return (
    <div className="vfd-showdown-difference-plaque mx-auto w-[max(4.5rem,min(72%,11rem))] -mt-[clamp(0.15rem,1.2cqw,0.35rem)] text-center">
      <p className="font-bold uppercase tracking-[0.16em] text-white/85 text-[clamp(0.42rem,3.8cqw,0.62rem)]">
        Difference
      </p>
      <p className="vfd-showdown-difference-value font-black tabular-nums leading-none text-[clamp(0.72rem,6.8cqw,1.05rem)]">
        {value}
      </p>
    </div>
  )
}

function ShowdownCompHeader({ title }: { title: string }) {
  return (
    <div className="flex w-full max-w-full shrink-0 flex-col items-center gap-[clamp(0.1rem,0.8cqw,0.25rem)]">
      <ShowdownWinnerCrown className="h-[clamp(0.85rem,7.5cqw,1.35rem)] w-auto" />
      <div className="flex w-[min(100%,11rem)] items-center gap-[clamp(0.2rem,1.5cqw,0.45rem)]">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/75 to-transparent" />
        <ShowdownGoldDiamond />
        <span className="shrink-0 font-black uppercase tracking-[0.18em] text-[#e2ad1a] text-[clamp(0.55rem,5.2cqw,0.82rem)]">
          {title}
        </span>
        <ShowdownGoldDiamond />
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/75 to-transparent" />
      </div>
    </div>
  )
}

function ShowdownCompIdentity({
  names,
  pot,
  each = false,
}: {
  names: readonly string[]
  pot: number
  each?: boolean
}) {
  return (
    <div className="relative flex w-full flex-col items-center justify-center px-[8%] py-[clamp(0.15rem,1.5cqw,0.4rem)]">
      <ShowdownLaurelArch className="absolute inset-x-0 top-[-8%] h-[clamp(3.5rem,38cqw,5.5rem)] w-full opacity-90" />
      <div className="relative z-10 flex w-full flex-col items-center gap-[clamp(0.08rem,0.8cqw,0.2rem)]">
        {names.length === 1 ? (
          <p className="max-w-full truncate text-center font-black leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] text-[clamp(0.95rem,11.5cqw,1.85rem)]">
            {names[0]}
          </p>
        ) : (
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center">
            {names.map((name, index) => (
              <Fragment key={name}>
                {index > 0 ? (
                  <span className="text-white/45" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="max-w-[min(100%,8rem)] truncate font-black leading-tight text-white text-[clamp(0.72rem,8.5cqw,1.35rem)]">
                  {name}
                </span>
              </Fragment>
            ))}
          </div>
        )}
        {pot > 0 ? <ShowdownCompPotAmount amount={pot} each={each} /> : null}
      </div>
    </div>
  )
}

function ShowdownCompFooter({
  chipRow,
  correctAnswer,
}: {
  chipRow: ShowdownResultRow | null
  correctAnswer: number | undefined
}) {
  const difference = formatWinnerDifference(chipRow, correctAnswer)

  return (
    <div className="flex w-full shrink-0 flex-col items-center">
      <div className="w-full px-[4%]">
        {chipRow != null ? (
          <ShowdownFiveCardsUsed row={chipRow} size="floor" />
        ) : (
          <span className="block text-center text-[0.6rem] text-white/35">—</span>
        )}
      </div>
      <div className="relative w-full max-w-[92%]">
        <ShowdownWinnerPodium className="h-[clamp(1.1rem,10cqw,1.75rem)]" />
        {difference != null ? <ShowdownDifferencePlaque value={difference} /> : null}
      </div>
    </div>
  )
}

export function ShowdownWinnerCompPanel({
  variant,
  winners,
  chipRow,
  pot,
  correctAnswer,
  sidePotLines,
}: {
  variant: 'winner' | 'split' | 'side'
  winners: readonly ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  pot: number
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
}) {
  const headerTitle =
    variant === 'split' ? 'Split pot' : variant === 'side' ? 'Side pot' : 'Winner'
  const names = winners.map((w) => w.name).filter(Boolean)
  const each = variant === 'split'

  let body: ReactNode

  if (variant === 'side' && sidePotLines != null && sidePotLines.length > 0) {
    body = (
      <>
        <div className="w-full shrink-0 px-1 pt-[clamp(0.1rem,1cqw,0.25rem)]">
          <ShowdownPotWinnerList lines={sidePotLines} />
        </div>
        <ShowdownCompFooter chipRow={chipRow} correctAnswer={correctAnswer} />
      </>
    )
  } else {
    body = (
      <>
        <ShowdownCompIdentity names={names} pot={pot} each={each} />
        <ShowdownCompFooter chipRow={chipRow} correctAnswer={correctAnswer} />
      </>
    )
  }

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-between gap-[clamp(0.08rem,0.9cqw,0.25rem)] px-1 pb-[clamp(0.15rem,1.2cqw,0.35rem)] pt-[clamp(0.1rem,1cqw,0.3rem)]"
      data-showdown-winner-comp
    >
      <ShowdownCompHeader title={headerTitle} />
      {body}
    </div>
  )
}
