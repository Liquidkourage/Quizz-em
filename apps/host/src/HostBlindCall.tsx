import { useEffect, useState } from 'react'
import { adviseBlindCall, type BlindCall } from '@qhe/core'

export const NIGHT_GOAL_MINUTES = [60, 90, 120, 150, 180, 210, 240] as const
const GOAL_KEY = 'qhe-night-goal-min'

export function minutesLeftOnClock(goalMin: number, showStartedAtMs: number | null, nowMs: number): number {
  if (showStartedAtMs == null) return goalMin
  return Math.max(0, goalMin - (nowMs - showStartedAtMs) / 60_000)
}

function readStoredGoal(): number {
  if (typeof localStorage === 'undefined') return 120
  const n = Number(localStorage.getItem(GOAL_KEY))
  return (NIGHT_GOAL_MINUTES as readonly number[]).includes(n) ? n : 120
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

function callSentence(call: BlindCall, guideNow: number): string {
  const blinds = `${money(call.smallBlind)} / ${money(call.bigBlind)}`
  const level = `level every ${call.handsPerLevel} hands`
  if (call.verb === 'Hold') return `Leave ${blinds} and a ${level}.`
  if (call.verb === 'Cut the guide' || call.verb === 'Stretch the guide') {
    return `Leave ${blinds}. Save a ${call.guideSec}s guessing guide.`
  }
  const guide = call.guideSec === guideNow ? '' : ` Save a ${call.guideSec}s guessing guide.`
  return `Set ${blinds} and ${level}.${guide}`
}

export function HostBlindCall({
  showStartedAtMs,
  handsLeft,
  players,
  startedWith,
  medianStack,
  smallBlind,
  bigBlind,
  handsPerLevel,
  guideSec,
  shuffleEvery,
  goalMinutes,
  onApply,
  onGoalMinutes,
  onSmallBlind,
  onBigBlind,
  onHandsPerLevel,
  onGuideSec,
  onShuffleEvery,
  onSave,
}: {
  showStartedAtMs: number | null
  handsLeft: number
  players: number
  startedWith: number
  medianStack: number | null
  smallBlind?: number
  bigBlind: number
  handsPerLevel: number
  guideSec: number
  /** Hands between table shuffles. Omitted until the desk is ready to edit it. */
  shuffleEvery?: number
  /** Overrides the remembered night length. The desk leaves this unset and uses local storage. */
  goalMinutes?: number
  onApply: (call: BlindCall) => void
  onGoalMinutes?: (minutes: number) => void
  onSmallBlind?: (n: number) => void
  onBigBlind?: (n: number) => void
  onHandsPerLevel?: (n: number) => void
  onGuideSec?: (n: number) => void
  onShuffleEvery?: (n: number) => void
  onSave?: () => void
}) {
  const [storedGoal, setStoredGoal] = useState(120)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setStoredGoal(readStoredGoal())
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const goal = goalMinutes ?? storedGoal
  const minutesLeft = minutesLeftOnClock(goal, showStartedAtMs, now)
  const ready = players >= 2 && medianStack != null && handsLeft >= 1 && bigBlind >= 1
  const call = ready
    ? adviseBlindCall({
        minutesLeft,
        handsLeft,
        players,
        startedWith: Math.max(players, startedWith),
        medianStack,
        bigBlind,
        handsPerLevel,
        guideSec,
      })
    : null

  const chooseGoal = (n: number) => {
    setStoredGoal(n)
    if (typeof localStorage !== 'undefined') localStorage.setItem(GOAL_KEY, String(n))
    onGoalMinutes?.(n)
  }
  const tune =
    onSave != null &&
    onSmallBlind != null &&
    onBigBlind != null &&
    onHandsPerLevel != null &&
    onGuideSec != null

  return (
    <div className="host-blind-call flex flex-col gap-2" aria-live="polite">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label className="flex items-center gap-2 text-base text-white/60">
        Night
        <select
          aria-label="Night length"
          value={String(goal)}
          onChange={(e) => chooseGoal(Number(e.target.value))}
          className="rounded-md border border-white/20 bg-zinc-950 py-1 pl-2 pr-8 text-base font-semibold text-white [color-scheme:dark]"
        >
          {NIGHT_GOAL_MINUTES.map((n) => (
            <option key={n} value={n}>
              {n} min
            </option>
          ))}
        </select>
      </label>
      {tune ? (
        <>
          <PaceNumber label="Small blind" value={smallBlind ?? bigBlind} min={1} onChange={(n) => onSmallBlind?.(n)} />
          <PaceNumber label="Big blind" value={bigBlind} min={1} onChange={(n) => onBigBlind?.(n)} />
          <PaceNumber label="Level every" value={handsPerLevel} min={1} max={50} onChange={(n) => onHandsPerLevel?.(n)} />
          {onShuffleEvery ? (
            <PaceNumber
              label="Re-seat every"
              value={shuffleEvery ?? 5}
              min={1}
              max={20}
              onChange={(n) => onShuffleEvery(Math.min(20, Math.max(1, Math.floor(n) || 1)))}
            />
          ) : null}
          <PaceNumber label="Guide" value={guideSec} min={15} max={300} step={5} onChange={(n) => onGuideSec?.(n)} />
          <button
            type="button"
            className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-base font-bold text-white hover:bg-white/15"
            onClick={() => onSave?.()}
          >
            Save
          </button>
        </>
      ) : null}
    </div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {call == null ? (
        <p className="text-base text-white/60">
          {handsLeft < 1 ? 'That rundown is finished.' : 'Fills in from the seated field, stacks, and blinds.'}
        </p>
      ) : (
        <>
          <p className="text-base font-semibold text-amber-50">
            {call.verb}
            <span className="ml-2 font-normal text-white/75">
              {callSentence(call, guideSec)} {Math.round(minutesLeft)} min · {players} players
            </span>
          </p>
          {call.verb === 'Hold' ? null : (
            <button
              type="button"
              className="rounded-md border border-amber-300/50 bg-amber-500/20 px-3 py-1.5 text-base font-bold text-amber-50 hover:bg-amber-500/30"
              onClick={() => onApply(call)}
            >
              Apply
            </button>
          )}
        </>
      )}
    </div>
    </div>
  )
}
