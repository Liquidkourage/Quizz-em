import { useEffect, useState } from 'react'
import type { StillGuessingPlayer } from './hostStillGuessing'

/** One column grows with the list. Past this, a second column keeps the popup on screen. */
const NUDGE_POPUP_TWO_COLUMNS_AT = 8

function noticePlace(dropped: boolean): string {
  return `pointer-events-auto fixed left-1/2 z-[72] -translate-x-1/2 ${dropped ? 'top-28' : 'top-4'}`
}

function GuessNames({
  players,
  twoColumns,
}: {
  players: StillGuessingPlayer[]
  twoColumns: boolean
}) {
  if (players.length === 0) return null
  return (
    <ul className={twoColumns ? 'mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5' : 'mt-1 space-y-0.5'}>
      {players.map((player, index) => (
        <li key={`${player.tableNum}:${index}:${player.name}`} className="text-xs leading-snug text-white/80">
          {player.name} · Table {player.tableNum}
        </li>
      ))}
    </ul>
  )
}

export default function HostStillGuessingNotice({
  contest,
  pointsOnly,
  dropped = false,
  onNudge,
  nudgeReady = false,
  startClosed = false,
}: {
  contest: StillGuessingPlayer[]
  pointsOnly: StillGuessingPlayer[]
  dropped?: boolean
  onNudge?: () => void
  /** True after the 45s answer timer has finished. */
  nudgeReady?: boolean
  /** First paint only. The host can close and reopen after that. */
  startClosed?: boolean
}) {
  const [closed, setClosed] = useState(startClosed || !nudgeReady)
  useEffect(() => {
    if (nudgeReady) setClosed(false)
  }, [nudgeReady])
  const place = noticePlace(dropped)
  const count = contest.length + pointsOnly.length

  if (closed) {
    return (
      <button
        type="button"
        className={`${place} rounded-full border border-amber-300/70 bg-amber-950/95 px-3 py-1.5 text-sm font-bold text-amber-50 shadow-lg`}
        onClick={() => setClosed(false)}
        aria-label="Show still guessing"
      >
        Still guessing · {count}
      </button>
    )
  }

  const twoColumns = count >= NUDGE_POPUP_TWO_COLUMNS_AT
  return (
    <div
      className={`${place} ${
        twoColumns ? 'w-[min(40rem,calc(100%-1.5rem))]' : 'w-[min(24rem,calc(100%-1.5rem))]'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Players still guessing"
    >
      <div className="rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-950/95 to-black/90 px-4 py-2.5 shadow-[0_0_32px_rgba(251,191,36,0.22)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-300/90">Update</p>
            <p className="text-base font-bold leading-snug text-white">Still guessing</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-white/25 px-2 py-0.5 text-xs font-bold text-white/80 hover:bg-white/10"
            onClick={() => setClosed(true)}
            aria-label="Close still guessing"
          >
            Close
          </button>
        </div>
        <GuessNames players={contest} twoColumns={twoColumns} />
        {pointsOnly.length > 0 ? (
          <div className="mt-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-200/90">Points only</p>
            <GuessNames players={pointsOnly} twoColumns={twoColumns} />
          </div>
        ) : null}
        {nudgeReady ? (
          <>
            <p className="mt-2 text-xs leading-snug text-amber-100/90">
              Nudge gives them 30 seconds. No guess scores 0 and cannot win the pot. Then reveal.
            </p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg border border-amber-300/70 bg-amber-400/20 px-3 py-1.5 text-sm font-bold text-amber-50 hover:bg-amber-400/30"
              onClick={onNudge}
              disabled={onNudge == null}
            >
              Nudge
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
