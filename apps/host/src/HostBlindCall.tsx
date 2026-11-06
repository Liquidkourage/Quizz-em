import { useEffect, useState } from 'react'
import { adviseBlindCall, type BlindLevelEstimate, type BlindPace } from '@qhe/core'
import { ChipText } from '@qhe/ui'

export const NIGHT_MINUTES = 120
export const GUIDE_SECONDS = 45

export function minutesLeftOnClock(goalMin: number, showStartedAtMs: number | null, nowMs: number): number {
  if (showStartedAtMs == null) return goalMin
  return Math.max(0, goalMin - (nowMs - showStartedAtMs) / 60_000)
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function PaceNumber({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max?: number
  step?: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex items-center gap-2 text-base text-white/60">
      {label}
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-[4.5rem] rounded-md border border-white/20 bg-zinc-950 py-1 text-center text-base font-semibold tabular-nums text-white [color-scheme:dark]"
      />
    </label>
  )
}

export function blindPaceRows(pace: BlindPace): {
  label: string
  text: string
  apply: boolean
  estimate: BlindLevelEstimate
}[] {
  const rows: { label: string; estimate: BlindLevelEstimate; apply: boolean }[] = [
    { label: 'Now', estimate: pace.current, apply: false },
  ]
  if (pace.nextLevel) rows.push({ label: 'Next level', estimate: pace.nextLevel, apply: false })
  if (pace.closestIncrease) {
    rows.push({ label: 'Closest increase', estimate: pace.closestIncrease, apply: true })
  }
  return rows.map((row) => ({
    ...row,
    text: `${money(row.estimate.smallBlind)} / ${money(row.estimate.bigBlind)}, ${Math.round(row.estimate.minutes)} min`,
  }))
}

export function BlindPaceReadout({
  pace,
  onApply,
}: {
  pace: BlindPace
  onApply: (estimate: BlindLevelEstimate) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {blindPaceRows(pace).map((row) => (
        <div key={row.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-base text-white/80">
            <span className="text-base font-semibold text-amber-50">{row.label}</span>
            <span className="ml-2 font-normal text-white/75">
              <ChipText text={row.text} />
            </span>
          </p>
          {row.apply ? (
            <button
              type="button"
              className="rounded-md border border-amber-300/50 bg-amber-500/20 px-3 py-1.5 text-base font-bold text-amber-50 hover:bg-amber-500/30"
              onClick={() => onApply(row.estimate)}
            >
              Apply
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function deskPace(input: {
  minutesLeft: number
  handsLeft: number
  players: number
  medianStack: number | null
  smallBlind: number
  bigBlind: number
}): BlindPace | null {
  if (input.players < 2 || input.medianStack == null || input.handsLeft < 1 || input.bigBlind < 1) return null
  return adviseBlindCall({
    minutesLeft: input.minutesLeft,
    handsLeft: input.handsLeft,
    players: input.players,
    medianStack: input.medianStack,
    smallBlind: input.smallBlind,
    bigBlind: input.bigBlind,
    guideSec: GUIDE_SECONDS,
  })
}

function paceWaitingCopy(handsLeft: number): string {
  return handsLeft < 1 ? 'That rundown is finished.' : 'Fills in from the seated field, stacks, and blinds.'
}

function BlindTuneFields({
  smallBlind,
  bigBlind,
  onSmallBlind,
  onBigBlind,
  onSave,
}: {
  smallBlind: number
  bigBlind: number
  onSmallBlind?: (n: number) => void
  onBigBlind?: (n: number) => void
  onSave?: () => void
}) {
  if (onSave == null || onSmallBlind == null || onBigBlind == null) return null
  return (
    <>
      <PaceNumber label="Small blind" value={smallBlind} min={1} onChange={onSmallBlind} />
      <PaceNumber label="Big blind" value={bigBlind} min={1} onChange={onBigBlind} />
      <button
        type="button"
        className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-base font-bold text-white hover:bg-white/15"
        onClick={onSave}
      >
        Save
      </button>
    </>
  )
}

export function HostBlindCall({
  showStartedAtMs,
  handsLeft,
  players,
  medianStack,
  smallBlind,
  bigBlind,
  onApply,
  onSmallBlind,
  onBigBlind,
  onSave,
}: {
  showStartedAtMs: number | null
  handsLeft: number
  players: number
  medianStack: number | null
  smallBlind?: number
  bigBlind: number
  /** Hands between table shuffles. Omitted until the desk is ready to edit it. */
  shuffleEvery?: number
  onApply: (estimate: BlindLevelEstimate) => void
  onSmallBlind?: (n: number) => void
  onBigBlind?: (n: number) => void
  onShuffleEvery?: (n: number) => void
  onSave?: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const minutesLeft = minutesLeftOnClock(NIGHT_MINUTES, showStartedAtMs, now)
  const pace = deskPace({
    minutesLeft,
    handsLeft,
    players,
    medianStack,
    smallBlind: smallBlind ?? bigBlind,
    bigBlind,
  })

  return (
    <div className="host-blind-call flex flex-col gap-2" aria-live="polite">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="text-base text-white/60">
        Night <span className="text-base font-semibold text-white">{NIGHT_MINUTES} min</span>
      </p>
      <BlindTuneFields
        smallBlind={smallBlind ?? bigBlind}
        bigBlind={bigBlind}
        onSmallBlind={onSmallBlind}
        onBigBlind={onBigBlind}
        onSave={onSave}
      />
    </div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {pace == null ? (
        <p className="text-base text-white/60">{paceWaitingCopy(handsLeft)}</p>
      ) : (
        <>
          <p className="text-base text-white/60">
            Goal <span className="text-base font-semibold text-white">{Math.round(minutesLeft)} min</span>
            <span className="ml-2">{players} players</span>
          </p>
          <BlindPaceReadout pace={pace} onApply={onApply} />
        </>
      )}
    </div>
    </div>
  )
}
