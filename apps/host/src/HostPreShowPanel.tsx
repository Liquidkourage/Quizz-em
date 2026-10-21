import { NeonButton, PokerChip } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'
import { isHostWaitingForJoiners } from './hostDeskLayout'

export function HostPreShowPanel({
  gameState,
  hostPlayerLabel,
  tvPairCode,
  setTvPairCode,
  onSeatPlayers,
  onGoQuestions,
  onPairTv,
}: {
  gameState: GameState
  hostPlayerLabel: (raw: string) => string
  tvPairCode: string
  setTvPairCode: (v: string) => void
  onSeatPlayers: () => void
  onGoQuestions: () => void
  onPairTv: (code: string) => void
}) {
  const waiting = isHostWaitingForJoiners(gameState)
  const lobbyPlayers =
    gameState.phase === 'lobby' && (gameState.tableId ?? '') === LOBBY_TABLE_ID
      ? gameState.players
      : []
  const canSeat = lobbyPlayers.length > 0

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">TV</h3>
            <p className="mt-1 text-sm text-white/50">
              Open <span className="font-mono text-white/70">/display</span>, enter the 4-letter code.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="••••"
                maxLength={4}
                value={tvPairCode}
                aria-label="Display pairing code from TV"
                onChange={(e) =>
                  setTvPairCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z2-9]/g, '')
                      .slice(0, 4),
                  )
                }
                className="w-[6.5rem] rounded-md border border-sky-500/35 bg-black/45 px-2 py-2 text-center font-mono text-lg tracking-[0.18em] text-white outline-none placeholder:text-white/20 focus:border-sky-500/60"
              />
              <NeonButton
                variant="gold"
                size="normal"
                disabled={tvPairCode.length !== 4}
                onClick={() => {
                  if (tvPairCode.length !== 4) return
                  onPairTv(tvPairCode)
                }}
              >
                Attach TV
              </NeonButton>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">Players</h3>
            {canSeat ? (
              <p className="mt-1 text-sm text-white/60">
                {lobbyPlayers.length} waiting — seat when ready.
              </p>
            ) : waiting ? (
              <p className="mt-1 text-sm text-white/50">Waiting for players…</p>
            ) : (
              <p className="mt-1 text-sm text-white/55">
                Seated. Switch to Live, or New game from Live → More.
              </p>
            )}

            {lobbyPlayers.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Players in waiting room">
                {lobbyPlayers.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full border border-emerald-400/40 bg-black/35 px-3 py-1 text-sm font-semibold text-emerald-100"
                  >
                    {hostPlayerLabel(p.name)}
                  </li>
                ))}
              </ul>
            ) : waiting ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-white/15 bg-black/25 px-3 py-4 text-white/40">
                <PokerChip size="md" className="opacity-70" />
                <span className="text-sm">No one yet</span>
              </div>
            ) : null}

            {canSeat ? (
              <NeonButton
                variant="blue"
                size="normal"
                className="mt-4 !px-6 !py-3.5 !text-lg !font-bold"
                onClick={onSeatPlayers}
              >
                Seat players at tables
              </NeonButton>
            ) : null}
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onGoQuestions}
            className="text-sm font-semibold text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
          >
            Questions & setlists
          </button>
        </div>
      </div>
    </div>
  )
}
