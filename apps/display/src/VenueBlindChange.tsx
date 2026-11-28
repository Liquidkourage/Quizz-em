import { useEffect, useState } from 'react'
import type { BlindChangeNotice } from '@qhe/net'
import { QuizzEmWordmark } from '@qhe/ui'

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

function BlindCoin({ amount, hero }: { amount: number; hero: boolean }) {
  return (
    <div className={`blind-coin${hero ? ' blind-coin-hero' : ''}`} aria-hidden>
      <span className="blind-coin-spots" />
      <span className="blind-coin-face">{moneyDigits(amount)}</span>
    </div>
  )
}

function BlindPairArt({
  label,
  smallBlind,
  bigBlind,
  tone,
}: {
  label: string
  smallBlind: number
  bigBlind: number
  tone: 'were' | 'now'
}) {
  return (
    <div className={tone === 'were' ? 'blind-change-were text-center' : 'blind-change-now relative text-center'} aria-label={blindChangeMoney(smallBlind, bigBlind)}>
      <p className="text-[clamp(0.95rem,2vh,1.35rem)] font-black uppercase tracking-[0.28em] text-amber-100/75">{label}</p>
      <div className={`blind-coin-row ${tone === 'now' ? 'blind-coin-row-now' : 'blind-coin-row-were'}`}>
        {tone === 'now' ? <span className="blind-coin-halo" aria-hidden /> : null}
        <BlindCoin amount={smallBlind} hero={false} />
        <BlindCoin amount={bigBlind} hero={tone === 'now'} />
        {tone === 'now' ? <span className="blind-change-sweep" aria-hidden /> : null}
      </div>
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
      <div className="relative z-10 mt-6 flex w-full max-w-6xl flex-wrap items-end justify-center gap-x-12 gap-y-8">
        {previous ? (
          <BlindPairArt label="Were" smallBlind={previous.smallBlind} bigBlind={previous.bigBlind} tone="were" />
        ) : null}
        {previous ? <div className="blind-change-rule mb-10 hidden h-1 w-24 rounded-full sm:block" aria-hidden /> : null}
        <BlindPairArt
          label={previous ? 'Now' : 'In play'}
          smallBlind={notice.smallBlind}
          bigBlind={notice.bigBlind}
          tone="now"
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
