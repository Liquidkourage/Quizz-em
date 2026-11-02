import type { StillGuessingPlayer } from './hostStillGuessing'

export default function HostStillGuessingNotice({
  players,
  dropped = false,
}: {
  players: StillGuessingPlayer[]
  dropped?: boolean
}) {
  return (
    <div
      className={`pointer-events-auto fixed left-1/2 z-[72] w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 ${dropped ? 'top-28' : 'top-4'}`}
      role="status"
      aria-live="polite"
      aria-label="Players still guessing"
    >
      <div className="max-h-64 overflow-y-auto rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-950/95 to-black/90 px-4 py-2.5 shadow-[0_0_32px_rgba(251,191,36,0.22)] backdrop-blur-md">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-300/90">Update</p>
        <p className="text-base font-bold leading-snug text-white">Still guessing</p>
        <ul className="mt-1 space-y-0.5">
          {players.map((player, index) => (
            <li key={`${player.tableNum}:${index}:${player.name}`} className="text-xs leading-snug text-white/80">
              {player.name} · Table {player.tableNum}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
