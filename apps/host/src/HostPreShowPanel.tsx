import { NeonButton, PokerChip } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID, VENUE_QUESTION_SET_LENGTH, formatSetlistProgress } from '@qhe/core'
// LOBBY_TABLE_ID used for waiting-room player filter
import { selectTriviaSetlist } from '@qhe/net'
import { HostBlindsControls, isHostWaitingForJoiners } from './hostDeskLayout'
import type { ComponentProps } from 'react'

type BlindsProps = ComponentProps<typeof HostBlindsControls>

export function HostPreShowPanel({
  gameState,
  hostPlayerLabel,
  tvPairCode,
  setTvPairCode,
  viteHostSecret,
  secretDraft,
  setSecretDraft,
  onApplyHostSecret,
  setlists,
  activeSetlistId,
  activeSetlistNextIndex,
  hostBlindsControlProps,
  onSeatPlayers,
  onGoQuestions,
  onPairTv,
}: {
  gameState: GameState
  hostPlayerLabel: (raw: string) => string
  tvPairCode: string
  setTvPairCode: (v: string) => void
  viteHostSecret: string
  secretDraft: string
  setSecretDraft: (v: string) => void
  onApplyHostSecret: () => void
  setlists: Array<{ id: string; name: string; questionIds: string[] }>
  activeSetlistId: string | null
  activeSetlistNextIndex: number
  hostBlindsControlProps: BlindsProps
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-casino-emerald/35 bg-black/45 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-casino-emerald/90">
              Pre-show
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Get the room ready</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
              Connect your audience TV, wait for players to join, then seat them. The live cue desk
              unlocks after seating.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Room code</p>
            <p className="mt-1 font-mono text-3xl font-black tracking-[0.12em] text-casino-gold sm:text-4xl">
              {gameState.code}
            </p>
            <p className="mt-1 text-xs text-white/40">Players type this on their phones</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">1. Connect a TV</h3>
          <p className="mt-1 text-sm text-white/50">
            Open <span className="font-mono text-white/70">/display</span> on the TV, then enter the
            4-letter code it shows.
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

          {!viteHostSecret ? (
            <form
              className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault()
                onApplyHostSecret()
              }}
            >
              <span className="text-white/50">Host password</span>
              <input
                type="password"
                value={secretDraft}
                onChange={(e) => setSecretDraft(e.target.value)}
                placeholder="if the server requires one"
                className="w-48 max-w-full rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-white"
                autoComplete="off"
              />
              <NeonButton variant="blue" size="small" type="submit">
                Apply & reconnect
              </NeonButton>
            </form>
          ) : (
            <p className="mt-3 text-xs text-emerald-200/80">Host password already configured.</p>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
            2. Players joining
          </h3>
          {waiting ? (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-white/75">
              <li>
                Share room{' '}
                <span className="font-mono font-semibold text-casino-gold">{gameState.code}</span>.
              </li>
              <li>Names appear in the list below as phones join.</li>
              <li>When everyone is here, seat them at tables to start.</li>
            </ol>
          ) : canSeat ? (
            <p className="mt-2 text-sm text-white/60">
              {lobbyPlayers.length} player{lobbyPlayers.length === 1 ? '' : 's'} in the waiting room —
              seat them when you’re ready.
            </p>
          ) : (
            <p className="mt-2 text-sm text-white/55">
              Tables are already seated. Switch to <strong className="text-white/80">Live</strong> to
              run the show, or start a new game from Live → More.
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
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-white/15 bg-black/25 px-4 py-6 text-white/40">
              <PokerChip size="md" className="opacity-70" />
              <span className="text-sm">Waiting for the first player…</span>
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
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
            3. Optional prep
          </h3>
          <NeonButton variant="purple" size="small" type="button" onClick={onGoQuestions}>
            Edit questions & setlists
          </NeonButton>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white/45">
              Active setlist
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-white/25 bg-zinc-950 px-3 py-2 text-sm text-white [color-scheme:dark]"
              value={activeSetlistId ?? ''}
              onChange={(e) => selectTriviaSetlist(e.target.value || null)}
            >
              <option value="" className="bg-zinc-950 text-white">
                No setlist (pick questions live)
              </option>
              {setlists.map((sl) => (
                <option key={sl.id} value={sl.id} className="bg-zinc-950 text-white">
                  {sl.name} ({formatSetlistProgress(sl.questionIds.length)})
                </option>
              ))}
            </select>
            {activeSetlistId ? (
              <p className="mt-1 text-xs text-white/50">
                {(() => {
                  const sl = setlists.find((s) => s.id === activeSetlistId)
                  const n = sl?.questionIds.length ?? 0
                  if (!n) return 'Empty — add cues under Questions.'
                  if (activeSetlistNextIndex >= n) return 'End of rundown.'
                  const progress = `${activeSetlistNextIndex + 1} / ${n}`
                  const setNote =
                    n === VENUE_QUESTION_SET_LENGTH
                      ? ''
                      : ` (${formatSetlistProgress(n)} — full sets are ${VENUE_QUESTION_SET_LENGTH})`
                  return `Next cue: ${progress}${setNote}`
                })()}
              </p>
            ) : null}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/45">Blinds</p>
            <HostBlindsControls {...hostBlindsControlProps} compact showTableOverride={false} />
          </div>
        </div>
      </section>
    </div>
  )
}
