import { adviseBlindCall, type BlindCall } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import { GUIDE_SECONDS, NIGHT_MINUTES, blindPaceLine, lockBlindGuide, minutesLeftOnClock } from './HostBlindCall'

export function showBlindPaceNotice(
  readyAtMs: number | null | undefined,
  nowMs: number,
  dismissedReadyAt: number | null,
): boolean {
  if (readyAtMs == null || dismissedReadyAt === readyAtMs) return false
  return nowMs < readyAtMs
}

export default function HostBlindPaceNotice({
  open,
  showStartedAtMs,
  handsLeft,
  players,
  startedWith,
  medianStack,
  bigBlind,
  handsPerLevel,
  nowMs,
  onApply,
  onClose,
}: {
  open: boolean
  showStartedAtMs: number | null
  handsLeft: number
  players: number
  startedWith: number
  medianStack: number | null
  bigBlind: number
  handsPerLevel: number
  nowMs: number
  onApply: (call: BlindCall) => void
  onClose: () => void
}) {
  if (!open || medianStack == null || players < 2 || handsLeft < 1 || bigBlind < 1) return null
  const minutesLeft = minutesLeftOnClock(NIGHT_MINUTES, showStartedAtMs, nowMs)
  const advised = adviseBlindCall({
    minutesLeft,
    handsLeft,
    players,
    startedWith: Math.max(players, startedWith),
    medianStack,
    bigBlind,
    handsPerLevel,
    guideSec: GUIDE_SECONDS,
  })
  const call = lockBlindGuide(advised, GUIDE_SECONDS, bigBlind, handsPerLevel)
  const line = `${blindPaceLine(call, GUIDE_SECONDS)} ${Math.round(minutesLeft)} min left.`

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-4 z-[80] w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2"
      role="status"
      aria-live="polite"
      aria-label="Blind pace"
    >
      <div className="rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-950/95 to-black/90 px-4 py-3 shadow-[0_0_32px_rgba(251,191,36,0.22)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-300/90">While the answer is up</p>
            <p className="text-base font-bold leading-snug text-white">{call.verb}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-white/25 px-2 py-0.5 text-xs font-bold text-white/80 hover:bg-white/10"
            onClick={onClose}
            aria-label="Close blind pace"
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-sm leading-snug text-amber-50">
          <ChipText text={line} />
        </p>
        {call.verb === 'Hold' ? null : (
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-amber-300/70 bg-amber-400/20 px-3 py-1.5 text-sm font-bold text-amber-50 hover:bg-amber-400/30"
            onClick={() => onApply(call)}
          >
            Apply
          </button>
        )}
      </div>
    </div>
  )
}
