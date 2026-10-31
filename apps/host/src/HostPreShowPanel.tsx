import { useEffect, useState } from 'react'
import { NeonButton, PokerChip } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import {
  computeOptimalTableCount,
  LOBBY_TABLE_ID,
  VENUE_CONDENSE_MAX_SEATS,
  VENUE_CONDENSE_MIN_SEATS,
  VENUE_NUMBERED_TABLE_MAX,
} from '@qhe/core'
import { isHostWaitingForJoiners } from './hostDeskLayout'
import { HostConnectedDisplays, type HostAttachedDisplay } from './HostConnectedDisplays'

export function HostPreShowPanel({
  gameState,
  hostPlayerLabel,
  tvPairCode,
  setTvPairCode,
  onSeatPlayers,
  onGoQuestions,
  onPairTv,
  attachedDisplays = [],
  onReleaseDisplay,
  floorSeated = false,
}: {
  gameState: GameState
  hostPlayerLabel: (raw: string) => string
  tvPairCode: string
  setTvPairCode: (v: string) => void
  onSeatPlayers: (plan: {
    tableCount: number
    assignments: { playerId: string; tableNum: number }[]
  }) => void
  onGoQuestions: () => void
  onPairTv: (code: string) => void
  attachedDisplays?: HostAttachedDisplay[]
  onReleaseDisplay?: (socketId: string) => void
  floorSeated?: boolean
}) {
  const waiting = isHostWaitingForJoiners(gameState)
  const lobbyPlayers =
    gameState.phase === 'lobby' && (gameState.tableId ?? '') === LOBBY_TABLE_ID
      ? gameState.players
      : []
  const canSeat = lobbyPlayers.length > 0
  const headcount = lobbyPlayers.length
  const suggested =
    headcount === 0
      ? 1
      : computeOptimalTableCount(headcount, VENUE_CONDENSE_MAX_SEATS, VENUE_CONDENSE_MIN_SEATS)
  const minTables = headcount === 0 ? 1 : Math.max(1, Math.ceil(headcount / VENUE_CONDENSE_MAX_SEATS))
  const maxTables = Math.max(minTables, Math.min(Math.max(headcount, 1), VENUE_NUMBERED_TABLE_MAX))
  const [tableCount, setTableCount] = useState(suggested)
  const [countTouched, setCountTouched] = useState(false)
  const [picks, setPicks] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!countTouched) {
      setTableCount(suggested)
      return
    }
    setTableCount((current) => Math.min(maxTables, Math.max(minTables, current)))
  }, [suggested, countTouched, minTables, maxTables])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5">
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto">
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
            <HostConnectedDisplays
              displays={attachedDisplays}
              onRelease={(socketId) => onReleaseDisplay?.(socketId)}
            />
            <p className="mt-2 text-xs text-white/40">
              Disconnect sends that TV back to the pairing code so it can join another event.
            </p>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">Players</h3>
            {canSeat ? (
              <p className="mt-1 text-sm text-white/60">
                {lobbyPlayers.length} waiting — set the tables, then seat.
              </p>
            ) : waiting && floorSeated ? (
              <p className="mt-1 text-sm text-white/60">
                Players are already seated. Open Live for the hand, or hard reset from More.
              </p>
            ) : waiting ? (
              <p className="mt-1 text-sm text-white/50">Waiting for players…</p>
            ) : (
              <p className="mt-1 text-sm text-white/55">
                Seated. The hand is on Live. Hard reset is under More.
              </p>
            )}

            {canSeat ? (
              <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
                Tables
                <input
                  type="number"
                  inputMode="numeric"
                  min={minTables}
                  max={maxTables}
                  value={tableCount}
                  aria-label="Number of tables"
                  onChange={(e) => {
                    setCountTouched(true)
                    const next = Math.floor(Number(e.target.value))
                    if (!Number.isFinite(next)) return
                    setTableCount(Math.min(maxTables, Math.max(minTables, next)))
                  }}
                  className="w-16 rounded-md border border-white/15 bg-black/45 px-2 py-1.5 text-center font-mono text-base text-white outline-none focus:border-sky-500/60"
                />
                <span className="text-xs text-white/40">
                  {minTables}–{maxTables}, {VENUE_CONDENSE_MAX_SEATS} seats each
                </span>
              </label>
            ) : null}

            {lobbyPlayers.length > 0 ? (
              <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto" aria-label="Players in waiting room">
                {lobbyPlayers.map((p) => {
                  const label = hostPlayerLabel(p.name)
                  const picked = picks[p.id]
                  const value = picked && picked >= 1 && picked <= tableCount ? String(picked) : ''
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-emerald-100">{label}</span>
                      <select
                        aria-label={`Table for ${label}`}
                        value={value}
                        onChange={(e) => {
                          const next = Number(e.target.value)
                          setPicks((current) => {
                            const copy = { ...current }
                            if (!Number.isFinite(next) || next < 1) delete copy[p.id]
                            else copy[p.id] = next
                            return copy
                          })
                        }}
                        className="shrink-0 rounded-md border border-white/15 bg-black/50 px-2 py-1 text-sm text-white"
                      >
                        <option value="">Auto</option>
                        {Array.from({ length: tableCount }, (_, index) => (
                          <option key={index + 1} value={index + 1}>
                            Table {index + 1}
                          </option>
                        ))}
                      </select>
                    </li>
                  )
                })}
              </ul>
            ) : waiting && !floorSeated ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-white/15 bg-black/25 px-3 py-4 text-white/40">
                <PokerChip size="md" className="opacity-70" />
                <span className="text-sm">No one yet</span>
              </div>
            ) : null}

            {canSeat ? (
              <>
                <p className="mt-2 text-xs text-white/40">
                  Auto fills open seats. Each table needs at least one player.
                </p>
                <NeonButton
                  variant="blue"
                  size="normal"
                  className="mt-3 !px-6 !py-3.5 !text-lg !font-bold"
                  onClick={() => {
                    const assignments = lobbyPlayers.flatMap((player) => {
                      const tableNum = picks[player.id]
                      if (!tableNum || tableNum < 1 || tableNum > tableCount) return []
                      return [{ playerId: player.id, tableNum }]
                    })
                    onSeatPlayers({ tableCount, assignments })
                  }}
                >
                  Seat players at tables
                </NeonButton>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-3 shrink-0 border-t border-white/10 pt-3">
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
