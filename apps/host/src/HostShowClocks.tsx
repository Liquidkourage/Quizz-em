import { useEffect, useState } from 'react'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { nowOnServerClock } from './serverClock'

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
  let latest: number | null = null
  for (const move of moves) {
    if (move.tableNum !== tableNum) continue
    if (handStartedAtMs != null && move.atMs < handStartedAtMs) continue
    if (latest == null || move.atMs > latest) latest = move.atMs
  }
  return latest ?? handStartedAtMs
}

/** How long the listed player has been the one to act. Their own action starts it over. */
export function tableActionClockStart(
  actingSinceMs: number | null | undefined,
  moves: readonly { tableNum: number; atMs: number }[],
  tableNum: number,
  handStartedAtMs: number | null,
): number | null {
  if (typeof actingSinceMs === 'number' && Number.isFinite(actingSinceMs)) {
    if (handStartedAtMs == null || actingSinceMs >= handStartedAtMs) return actingSinceMs
  }
  return lastActionAtMs(moves, tableNum, handStartedAtMs)
}

/** Players whose turn has already lasted 15 seconds. One per open betting table. */
export function slowActionPlayerCount(
  rows: readonly {
    tableNum: number
    phase: string
    betsClosed?: boolean
    actingPlayerName?: string | null
    actingSinceMs?: number | null
  }[],
  moves: readonly { tableNum: number; atMs: number }[],
  handStartedAtMs: number | null,
  nowMs: number,
): number {
  let count = 0
  for (const row of rows) {
    if (row.phase !== 'betting' || row.betsClosed === true || !row.actingPlayerName?.trim()) continue
    const started = tableActionClockStart(row.actingSinceMs, moves, row.tableNum, handStartedAtMs)
    if (started != null && nowMs - started >= 15_000) count += 1
  }
  return count
}

export function nudgeSlowPlayersLabel(count: number): string {
  return `Nudge slow players (${count})`
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
  const [ticked, setTicked] = useState(() => nowMs ?? nowOnServerClock())
  useEffect(() => {
    if (nowMs != null) return
    const id = window.setInterval(() => setTicked(nowOnServerClock()), 1000)
    return () => window.clearInterval(id)
  }, [nowMs])
  return nowMs ?? ticked
}

function clockRunsPastAnHour(value: string): boolean {
  return value.split(':').length > 2
}

function ClockFace({
  label,
  value,
  urgent = false,
  roomy = false,
}: {
  label: string
  value: string
  urgent?: boolean
  roomy?: boolean
}) {
  const hour = clockRunsPastAnHour(value)
  const box = roomy ? 'w-44 px-2' : hour ? 'min-w-[8.5rem] w-auto px-2.5' : 'w-28 px-2'
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border py-3 ${box} ${
        urgent ? 'border-rose-400/75 bg-rose-950/45' : 'border-white/20 bg-black/40'
      }`}
    >
      <span
        className={`text-center text-[0.65rem] font-bold uppercase leading-tight text-white/70 ${
          roomy ? 'tracking-normal' : 'tracking-[0.12em]'
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono font-black leading-none tabular-nums ${hour ? 'text-2xl' : 'text-3xl'} ${
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
  phaseStartedAtMs = null,
  nowMs,
}: {
  showStartedAtMs: number | null
  handStartedAtMs: number | null
  /** How long the current betting street has been running. Hidden outside betting. */
  phaseStartedAtMs?: number | null
  nowMs?: number
}) {
  const now = useClockNow(nowMs)
  const showPhase = phaseStartedAtMs != null && Number.isFinite(phaseStartedAtMs)
  return (
    <div className="flex shrink-0 gap-2" aria-label="Show clocks">
      <ClockFace label="Event" value={formatElapsedClock(showStartedAtMs, now)} />
      <ClockFace label="Hand" value={formatElapsedClock(handStartedAtMs, now)} />
      {showPhase ? <ClockFace label="Phase" value={formatElapsedClock(phaseStartedAtMs, now)} /> : null}
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
    <div aria-label={`${soonest} seconds left. Last call for responses`}>
      <ClockFace label="Last call for responses" value={String(soonest)} urgent={soonest <= 10} roomy />
    </div>
  )
}
