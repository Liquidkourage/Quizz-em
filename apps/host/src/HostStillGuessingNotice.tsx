import type { StillGuessingPlayer } from './hostStillGuessing'

/** One column grows with the list. Past this, a second column keeps the popup on screen. */
const NUDGE_POPUP_TWO_COLUMNS_AT = 8

export default function HostStillGuessingNotice({
  players,
  dropped = false,
  onNudge,
}: {
  players: StillGuessingPlayer[]
  dropped?: boolean
  onNudge?: () => void
}) {
  const twoColumns = players.length >= NUDGE_POPUP_TWO_COLUMNS_AT
  return (
    <div
      className={`pointer-events-auto fixed left-1/2 z-[72] -translate-x-1/2 ${
        twoColumns ? 'w-[min(40rem,calc(100%-1.5rem))]' : 'w-[min(24rem,calc(100%-1.5rem))]'
      } ${dropped ? 'top-28' : 'top-4'}`}
      role="status"
      aria-live="polite"
      aria-label="Players still guessing"
    >
      <div className="rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-950/95 to-black/90 px-4 py-2.5 shadow-[0_0_32px_rgba(251,191,36,0.22)] backdrop-blur-md">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-300/90">Update</p>
        <p className="text-base font-bold leading-snug text-white">Still guessing</p>
        <ul className={twoColumns ? 'mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5' : 'mt-1 space-y-0.5'}>
          {players.map((player, index) => (
            <li key={`${player.tableNum}:${index}:${player.name}`} className="text-xs leading-snug text-white/80">
              {player.name} · Table {player.tableNum}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-snug text-amber-100/90">
          Nudge gives them 30 seconds. No guess scores 0 and cannot win the pot. Then reveal.
        </p>
        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-amber-300/70 bg-amber-400/20 px-3 py-1.5 text-sm font-bold text-amber-50 hover:bg-amber-400/30"
          onClick={onNudge}
        >
          Nudge
        </button>
      </div>
    </div>
  )
}
