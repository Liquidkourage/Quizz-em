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
  bigBlind,
  handsPerLevel,
  guideSec,
  goalMinutes,
  onApply,
  onGoalMinutes,
}: {
  showStartedAtMs: number | null
  handsLeft: number
  players: number
  startedWith: number
  medianStack: number | null
  bigBlind: number
  handsPerLevel: number
  guideSec: number
  /** Overrides the remembered night length. The desk leaves this unset and uses local storage. */
  goalMinutes?: number
  onApply: (call: BlindCall) => void
  onGoalMinutes?: (minutes: number) => void
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

  return (
    <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-950/25 px-3 py-2" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-100/80">Blind call</p>
        <label className="flex items-center gap-1.5 text-xs text-white/50">
          Night
          <select
            aria-label="Night length"
            value={String(goal)}
            onChange={(e) => chooseGoal(Number(e.target.value))}
            className="rounded-md border border-white/20 bg-zinc-950 py-0.5 pl-1.5 pr-6 text-xs font-semibold text-white [color-scheme:dark]"
          >
            {NIGHT_GOAL_MINUTES.map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </select>
        </label>
      </div>
      {call == null ? (
        <p className="mt-1 text-sm text-white/60">
          {handsLeft < 1 ? 'That rundown is finished.' : 'Fills in from the seated field, stacks, and blinds.'}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm font-semibold text-amber-50">
            {call.verb}
            <span className="ml-2 font-normal text-white/70">
              {Math.round(minutesLeft)} min left · {players} players · median {money(medianStack ?? 0)} (
              {Math.round(call.depthNowBb)} bb)
            </span>
          </p>
          <p className="mt-0.5 text-sm text-white/75">{callSentence(call, guideSec)}</p>
          {call.verb === 'Hold' ? null : (
            <button
              type="button"
              className="mt-2 rounded-md border border-amber-300/50 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-50 hover:bg-amber-500/30"
              onClick={() => onApply(call)}
            >
              Apply
            </button>
          )}
        </>
      )}
    </div>
  )
}
