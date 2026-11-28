import { useEffect, useState } from 'react'
import type { BlindChangeNotice } from '@qhe/net'
import { ChipText, QuizzEmWordmark } from '@qhe/ui'

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

function BlindAmount({
  label,
  smallBlind,
  bigBlind,
  amountClass,
}: {
  label: string
  smallBlind: number
  bigBlind: number
  amountClass: string
}) {
  return (
    <div className="text-center">
      <p className="text-[clamp(0.9rem,1.8vh,1.2rem)] font-bold uppercase tracking-[0.22em] text-amber-100/60">{label}</p>
      <p className={amountClass}>
        <ChipText text={blindChangeMoney(smallBlind, bigBlind)} />
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
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_48%_at_50%_46%,rgba(251,191,36,0.18),transparent_68%)]"
        aria-hidden
      />
      <div className="relative z-10 mb-8 w-[clamp(7rem,14vw,11rem)]" style={{ aspectRatio: '958 / 592' }}>
        <QuizzEmWordmark layout="fill" />
      </div>
      <p className="relative z-10 font-orbitron text-[clamp(1.15rem,2.6vh,1.7rem)] font-black uppercase tracking-[0.28em] text-amber-100/85">
        Blinds
      </p>
      <div className="relative z-10 mt-8 flex w-full max-w-6xl flex-wrap items-end justify-center gap-x-10 gap-y-8">
        {previous ? (
          <div className="blind-change-were">
            <BlindAmount
              label="Were"
              smallBlind={previous.smallBlind}
              bigBlind={previous.bigBlind}
              amountClass="mt-3 text-[clamp(2rem,4.6vw,3.5rem)] font-black leading-none text-white/45"
            />
          </div>
        ) : null}
        {previous ? (
          <div className="blind-change-rule mb-3 hidden h-0.5 w-20 bg-gradient-to-r from-white/15 via-amber-200 to-amber-300 sm:block" aria-hidden />
        ) : null}
        <div className="blind-change-now relative overflow-hidden">
          <div
            className="blind-change-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-100/35 to-transparent"
            aria-hidden
          />
          <BlindAmount
            label={previous ? 'Now' : 'In play'}
            smallBlind={notice.smallBlind}
            bigBlind={notice.bigBlind}
            amountClass="relative mt-3 text-[clamp(3.6rem,9vw,7.4rem)] font-black leading-none text-amber-50 drop-shadow-[0_0_32px_rgba(251,191,36,0.42)]"
          />
        </div>
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
