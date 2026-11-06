import { adviseBlindCall, type BlindLevelEstimate } from '@qhe/core'
import { BlindPaceReadout, GUIDE_SECONDS, NIGHT_MINUTES, minutesLeftOnClock } from './HostBlindCall'

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
  medianStack,
  smallBlind,
  bigBlind,
  nowMs,
  onApply,
  onClose,
}: {
  open: boolean
  showStartedAtMs: number | null
  handsLeft: number
  players: number
  medianStack: number | null
  smallBlind?: number
  bigBlind: number
  nowMs: number
  onApply: (estimate: BlindLevelEstimate) => void
  onClose: () => void
}) {
  if (!open || medianStack == null || players < 2 || handsLeft < 1 || bigBlind < 1) return null
  const minutesLeft = minutesLeftOnClock(NIGHT_MINUTES, showStartedAtMs, nowMs)
  const pace = adviseBlindCall({
    minutesLeft,
    handsLeft,
    players,
    medianStack,
    smallBlind: smallBlind ?? bigBlind,
    bigBlind,
    guideSec: GUIDE_SECONDS,
  })

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
            <p className="text-base font-bold leading-snug text-white">
              Goal {Math.round(minutesLeft)} min · {players} players
            </p>
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
        <div className="mt-2">
          <BlindPaceReadout pace={pace} onApply={onApply} />
        </div>
      </div>
    </div>
  )
}
