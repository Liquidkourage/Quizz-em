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

export function BlindChangeCard({ notice }: { notice: BlindChangeNotice }) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), BLIND_CHANGE_MS)
    return () => window.clearTimeout(timer)
  }, [notice.atMs])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-6" role="dialog" aria-modal="true" aria-label="Blinds changed">
      <button type="button" className="absolute inset-0" aria-label="Dismiss" onClick={() => setOpen(false)} />
      <div className="relative rounded-2xl border border-amber-200/40 bg-zinc-950/95 px-10 py-8 text-center shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-100/80">Blinds</p>
        <p className="mt-3 text-5xl font-black text-white">
          <ChipText text={blindChangeMoney(notice.smallBlind, notice.bigBlind)} />
        </p>
      </div>
    </div>
  )
}

export default function VenueBlindChange({ notice }: { notice: BlindChangeNotice | null }) {
  if (notice == null) return null
  return <BlindChangeCard key={notice.atMs} notice={notice} />
}
