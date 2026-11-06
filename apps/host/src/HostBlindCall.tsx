import { useEffect, useState } from 'react'
import { adviseBlindCall, type BlindCall } from '@qhe/core'
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

/** The guessing guide stays put. A call that only retimes it is a hold. */
export function lockBlindGuide(call: BlindCall, guideSec: number, bigBlind: number, handsPerLevel: number): BlindCall {
  const sameStructure = call.bigBlind === bigBlind && call.handsPerLevel === handsPerLevel
  const guideOnly = sameStructure && call.guideSec !== guideSec
  return { ...call, guideSec, verb: guideOnly ? 'Hold' : call.verb }
}

export function blindPaceLine(call: BlindCall, guideNow: number): string {
  const blinds = `${money(call.smallBlind)} / ${money(call.bigBlind)}`
  if (call.verb === 'Hold') return `Leave ${blinds}.`
  if (call.verb === 'Cut the guide' || call.verb === 'Stretch the guide') {
    return `Leave ${blinds}. Save a ${call.guideSec}s guessing guide.`
  }
  const guide = call.guideSec === guideNow ? '' : ` Save a ${call.guideSec}s guessing guide.`
  return `Set ${blinds}.${guide}`
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
  onApply,
  onSmallBlind,
  onBigBlind,
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
  /** Hands between table shuffles. Omitted until the desk is ready to edit it. */
  shuffleEvery?: number
  onApply: (call: BlindCall) => void
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
  const ready = players >= 2 && medianStack != null && handsLeft >= 1 && bigBlind >= 1
  const advised = ready
    ? adviseBlindCall({
        minutesLeft,
        handsLeft,
        players,
        startedWith: Math.max(players, startedWith),
        medianStack,
        bigBlind,
        handsPerLevel,
        guideSec: GUIDE_SECONDS,
      })
    : null
  const call = advised == null ? null : lockBlindGuide(advised, GUIDE_SECONDS, bigBlind, handsPerLevel)

  const tune = onSave != null && onSmallBlind != null && onBigBlind != null

  return (
    <div className="host-blind-call flex flex-col gap-2" aria-live="polite">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="text-base text-white/60">
        Night <span className="text-base font-semibold text-white">{NIGHT_MINUTES} min</span>
      </p>
      {tune ? (
        <>
          <PaceNumber label="Small blind" value={smallBlind ?? bigBlind} min={1} onChange={(n) => onSmallBlind?.(n)} />
          <PaceNumber label="Big blind" value={bigBlind} min={1} onChange={(n) => onBigBlind?.(n)} />
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
              <ChipText
                text={`${blindPaceLine(call, GUIDE_SECONDS)} ${Math.round(minutesLeft)} min · ${players} players`}
              />
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
