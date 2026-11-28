import { useEffect, useState } from 'react'
import type { BlindChangeNotice } from '@qhe/net'
import { ChipText } from '@qhe/ui'

export const BLIND_CHANGE_MS = 4500

export function blindChangeFromPayload(raw: unknown): BlindChangeNotice | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as { smallBlind?: unknown; bigBlind?: unknown; atMs?: unknown }
  const smallBlind = wholeBlind(row.smallBlind)
  const bigBlind = wholeBlind(row.bigBlind)
  const atMs = typeof row.atMs === 'number' && Number.isFinite(row.atMs) ? row.atMs : null
  if (smallBlind == null || bigBlind == null || atMs == null || atMs < 1) return null
  return { smallBlind, bigBlind, atMs }
}

function wholeBlind(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null
  return Math.floor(value)
}

function blindChangeMoney(smallBlind: number, bigBlind: number): string {
  const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  return `${money(smallBlind)} / ${money(bigBlind)}`
}

/** The question stays off the TV until this blinds announcement has had the screen. */
export function questionYieldsToBlinds(
  questionOnScreen: boolean,
  blindsAtMs: number | null,
  blindsFinishedAtMs: number | null,
): boolean {
  return questionOnScreen && blindsAtMs != null && blindsFinishedAtMs !== blindsAtMs
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
      className="fixed inset-0 z-[220] flex flex-col items-center justify-center bg-[#050806] px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Blinds changed"
    >
      <p className="text-[clamp(1.1rem,2.4vh,1.6rem)] font-black uppercase tracking-[0.2em] text-amber-100/80">Blinds</p>
      <p className="mt-4 text-center text-[clamp(4rem,12vw,8rem)] font-black leading-none text-white">
        <ChipText text={blindChangeMoney(notice.smallBlind, notice.bigBlind)} />
      </p>
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
