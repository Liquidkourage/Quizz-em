import { useEffect, useState } from 'react'
import type { HostVenueFeltBeatRow } from '@qhe/net'

export function formatElapsedClock(startedAtMs: number | null, nowMs: number): string {
  if (startedAtMs == null || !Number.isFinite(startedAtMs)) return '—'
  const total = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
  return `${minutes}:${ss}`
}

/** Latest action this hand, or the hand start when the table has not acted yet. */
export function lastActionAtMs(
  moves: readonly { tableNum: number; atMs: number }[],
  tableNum: number,
  handStartedAtMs: number | null,
): number | null {
  if (handStartedAtMs == null) return null
  let latest = handStartedAtMs
  for (const move of moves) {
    if (move.tableNum !== tableNum || move.atMs < handStartedAtMs) continue
    if (move.atMs > latest) latest = move.atMs
  }
  return latest
}

export function soonestNudgeSeconds(
  rows: readonly Pick<HostVenueFeltBeatRow, 'turnDeadlineMs'>[] | null,
  nowMs: number,
): number | null {
  let soonest: number | null = null
  for (const row of rows ?? []) {
    const deadline = row.turnDeadlineMs
    if (typeof deadline !== 'number' || !Number.isFinite(deadline)) continue
    const sec = Math.max(0, Math.ceil((deadline - nowMs) / 1000))
    soonest = soonest == null ? sec : Math.min(soonest, sec)
  }
  return soonest
}

export function feltCountdownSec(
  row: Pick<HostVenueFeltBeatRow, 'phase' | 'answerDeadlineMs' | 'turnDeadlineMs'>,
  nowMs: number,
): number | null {
  if (row.phase === 'answering' && row.answerDeadlineMs != null) {
    return Math.max(0, Math.ceil((row.answerDeadlineMs - nowMs) / 1000))
  }
  if (typeof row.turnDeadlineMs === 'number' && Number.isFinite(row.turnDeadlineMs)) {
    return Math.max(0, Math.ceil((row.turnDeadlineMs - nowMs) / 1000))
  }
  return null
}

function useClockNow(nowMs?: number): number {
  const [ticked, setTicked] = useState(() => nowMs ?? Date.now())
  useEffect(() => {
    if (nowMs != null) return
    const id = window.setInterval(() => setTicked(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [nowMs])
  return nowMs ?? ticked
}

function ClockFace({ label, value, urgent = false }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div
      className={`flex w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 ${
        urgent ? 'border-rose-400/75 bg-rose-950/45' : 'border-white/20 bg-black/40'
      }`}
    >
      <span className="text-center text-[0.65rem] font-bold uppercase leading-tight tracking-[0.12em] text-white/70">
        {label}
      </span>
      <span
        className={`font-mono text-3xl font-black leading-none tabular-nums ${
          urgent ? 'text-rose-200' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/** Elapsed night and elapsed hand. Both stay on the desk for the whole show. */
export function HostShowClocks({
  showStartedAtMs,
  handStartedAtMs,
  nowMs,
}: {
  showStartedAtMs: number | null
  handStartedAtMs: number | null
  nowMs?: number
}) {
  const now = useClockNow(nowMs)
  return (
    <div className="flex shrink-0 gap-2" aria-label="Show clocks">
      <ClockFace label="Event" value={formatElapsedClock(showStartedAtMs, now)} />
      <ClockFace label="Hand" value={formatElapsedClock(handStartedAtMs, now)} />
    </div>
  )
}

/** 30s host nudge on the seat that must act. Hidden until a nudge is running. */
export function HostNudgeClock({
  rows,
  nowMs,
}: {
  rows: readonly HostVenueFeltBeatRow[] | null
  nowMs?: number
}) {
  const now = useClockNow(nowMs)
  const soonest = soonestNudgeSeconds(rows, now)
  if (soonest == null) return null
  return (
    <div aria-label={`${soonest} seconds left on the nudge`}>
      <ClockFace label="Nudge" value={String(soonest)} urgent={soonest <= 10} />
    </div>
  )
}
