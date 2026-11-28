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

function blindMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

function blindChangeMoney(smallBlind: number, bigBlind: number): string {
  return `${blindMoney(smallBlind)} / ${blindMoney(bigBlind)}`
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

/** Ease-out so the pair ticks quickly, then settles on the new blinds. */
export function climbedBlind(from: number, to: number, progress: number): number {
  const t = progress < 0 ? 0 : progress > 1 ? 1 : progress
  const ease = 1 - (1 - t) ** 3
  return Math.round(from + (to - from) * ease)
}

/** Share of the tallest blind, so a column can grow from the old amount to the new one. */
export function blindRise(amount: number, peak: number): number {
  if (!(peak > 0)) return 1
  const ratio = amount / peak
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
  return Math.round(clamped * 1000) / 1000
}

const BLIND_CLIMB_MS = 2200

function BlindScore({ notice }: { notice: BlindChangeNotice }) {
  const previous = previousPair(notice)
  const fromSmall = previous?.smallBlind
  const fromBig = previous?.bigBlind
  const reduce = useReducedMotion()
  const [small, setSmall] = useState(fromSmall ?? notice.smallBlind)
  const [big, setBig] = useState(fromBig ?? notice.bigBlind)

  useEffect(() => {
    if (fromSmall == null || fromBig == null || reduce) {
      setSmall(notice.smallBlind)
      setBig(notice.bigBlind)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / BLIND_CLIMB_MS)
      setSmall(climbedBlind(fromSmall, notice.smallBlind, t))
      setBig(climbedBlind(fromBig, notice.bigBlind, t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    setSmall(fromSmall)
    setBig(fromBig)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [notice.atMs, notice.smallBlind, notice.bigBlind, fromSmall, fromBig, reduce])

  const peak = Math.max(notice.bigBlind, fromBig ?? notice.bigBlind)
  return (
    <div className="blind-board">
      <p className="blind-title">Blinds</p>
      <div className="blind-stage" aria-label={blindChangeMoney(notice.smallBlind, notice.bigBlind)}>
        <div className="blind-rise" aria-hidden>
          <div className="blind-rise-shaft" style={{ ['--rise' as string]: blindRise(small, peak) }}>
            <div className="blind-rise-fill blind-rise-small" />
            <span className="blind-rise-amount">{blindMoney(small)}</span>
          </div>
          <div className="blind-rise-shaft blind-rise-shaft-big" style={{ ['--rise' as string]: blindRise(big, peak) }}>
            <div className="blind-rise-fill blind-rise-big" />
            <span className="blind-rise-amount">{blindMoney(big)}</span>
          </div>
        </div>
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
      <BlindScore notice={notice} />
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
