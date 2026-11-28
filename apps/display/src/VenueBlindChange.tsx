import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { BlindChangeNotice } from '@qhe/net'

export const BLIND_CHANGE_MS = 4500

export function blindChangeFromPayload(raw: unknown): BlindChangeNotice | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as {
    smallBlind?: unknown
    bigBlind?: unknown
    atMs?: unknown
    previousSmallBlind?: unknown
    previousBigBlind?: unknown
  }
  const smallBlind = wholeBlind(row.smallBlind)
  const bigBlind = wholeBlind(row.bigBlind)
  const atMs = typeof row.atMs === 'number' && Number.isFinite(row.atMs) ? row.atMs : null
  if (smallBlind == null || bigBlind == null || atMs == null || atMs < 1) return null
  const previousSmallBlind = wholeBlind(row.previousSmallBlind)
  const previousBigBlind = wholeBlind(row.previousBigBlind)
  return {
    smallBlind,
    bigBlind,
    atMs,
    ...(previousSmallBlind != null && previousBigBlind != null ? { previousSmallBlind, previousBigBlind } : {}),
  }
}

function wholeBlind(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null
  return Math.floor(value)
}

function blindChangeMoney(smallBlind: number, bigBlind: number): string {
  const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  return `${money(smallBlind)} / ${money(bigBlind)}`
}

function previousPair(notice: BlindChangeNotice): { smallBlind: number; bigBlind: number } | null {
  const smallBlind = notice.previousSmallBlind
  const bigBlind = notice.previousBigBlind
  if (smallBlind == null || bigBlind == null) return null
  if (smallBlind === notice.smallBlind && bigBlind === notice.bigBlind) return null
  return { smallBlind, bigBlind }
}

/** The question stays off the TV until this blinds announcement has had the screen. */
export function questionYieldsToBlinds(
  questionOnScreen: boolean,
  blindsAtMs: number | null,
  blindsFinishedAtMs: number | null,
): boolean {
  return questionOnScreen && blindsAtMs != null && blindsFinishedAtMs !== blindsAtMs
}

function moneyDigits(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

/** Extra full turn so a digit that barely changes still rolls. */
function reelTravel(from: number, to: number): number {
  const steps = (to - from + 10) % 10
  return steps === 0 ? 10 : steps + 10
}

function alignedGlyphs(fromAmount: number, toAmount: number): { from: string; to: string }[] {
  const fromText = moneyDigits(fromAmount)
  const toText = moneyDigits(toAmount)
  const width = Math.max(fromText.length, toText.length)
  const fromPad = fromText.padStart(width, ' ')
  const toPad = toText.padStart(width, ' ')
  return [...toPad].map((to, index) => ({ from: fromPad[index] ?? ' ', to }))
}

function BlindGlyph({ from, to, delay }: { from: string; to: string; delay: number }) {
  if (from === ' ' && to === ' ') return null
  const fromDigit = /\d/.test(from) ? Number(from) : null
  const toDigit = /\d/.test(to) ? Number(to) : null
  if (fromDigit == null || toDigit == null) {
    return (
      <span className="blind-glyph-lock" style={{ animationDelay: `${delay}s` }}>
        {to === ' ' ? '' : to}
      </span>
    )
  }
  const travel = reelTravel(fromDigit, toDigit)
  const cells = Array.from({ length: travel + 1 }, (_, step) => (fromDigit + step) % 10)
  return (
    <span className="blind-reel" aria-hidden>
      <span
        className="blind-reel-strip"
        style={{ ['--reel-end' as string]: `-${travel}em`, animationDelay: `${delay}s` }}
      >
        {cells.map((digit, index) => (
          <span key={index}>{digit}</span>
        ))}
      </span>
    </span>
  )
}

function BlindRoll({ from, to, delay }: { from: number; to: number; delay: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <span>{moneyDigits(to)}</span>
  const glyphs = alignedGlyphs(from, to)
  return (
    <span className="blind-roll" aria-hidden>
      {glyphs.map((glyph, index) => (
        <BlindGlyph key={index} from={glyph.from} to={glyph.to} delay={delay + index * 0.05} />
      ))}
    </span>
  )
}

function BlindFigure({
  smallBlind,
  bigBlind,
  fromSmall,
  fromBig,
  tone,
  rollDelay,
}: {
  smallBlind: number
  bigBlind: number
  fromSmall: number
  fromBig: number
  tone: 'were' | 'now'
  rollDelay: number
}) {
  return (
    <div className={tone === 'were' ? 'blind-change-were text-center' : 'blind-change-now text-center'} aria-label={blindChangeMoney(smallBlind, bigBlind)}>
      <p className="blind-figure">
        {tone === 'were' ? (
          moneyDigits(smallBlind)
        ) : (
          <BlindRoll from={fromSmall} to={smallBlind} delay={rollDelay} />
        )}
        <span className="blind-slash"> / </span>
        {tone === 'were' ? moneyDigits(bigBlind) : <BlindRoll from={fromBig} to={bigBlind} delay={rollDelay + 0.18} />}
      </p>
    </div>
  )
}

export function BlindChangeCard({
  notice,
  onFinished,
}: {
  notice: BlindChangeNotice
  onFinished?: (atMs: number) => void
}) {
  const [open, setOpen] = useState(true)
  const previous = previousPair(notice)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), BLIND_CHANGE_MS)
    return () => window.clearTimeout(timer)
  }, [notice.atMs])

  useEffect(() => {
    if (!open) onFinished?.(notice.atMs)
  }, [open, notice.atMs, onFinished])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col items-center justify-center overflow-hidden bg-[#050806] px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Blinds changed"
    >
      <div className="blind-beam blind-beam-a" aria-hidden />
      <div className="blind-beam blind-beam-b" aria-hidden />
      <div className="blind-beam blind-beam-c" aria-hidden />
      <p className="blind-title relative z-10">Blinds</p>
      <div className="relative z-10 mt-2 flex w-full max-w-6xl flex-col items-center">
        {previous ? (
          <BlindFigure
            smallBlind={previous.smallBlind}
            bigBlind={previous.bigBlind}
            fromSmall={previous.smallBlind}
            fromBig={previous.bigBlind}
            tone="were"
            rollDelay={0}
          />
        ) : null}
        <BlindFigure
          smallBlind={notice.smallBlind}
          bigBlind={notice.bigBlind}
          fromSmall={previous?.smallBlind ?? notice.smallBlind}
          fromBig={previous?.bigBlind ?? notice.bigBlind}
          tone="now"
          rollDelay={1.15}
        />
      </div>
    </div>
  )
}

export default function VenueBlindChange({
  notice,
  onFinished,
}: {
  notice: BlindChangeNotice | null
  onFinished?: (atMs: number) => void
}) {
  if (notice == null) return null
  return <BlindChangeCard key={notice.atMs} notice={notice} onFinished={onFinished} />
}
