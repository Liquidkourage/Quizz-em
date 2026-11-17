import { useState } from 'react'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'

export type HostManagedPlayer = {
  playerId: string
  name: string
  /** Null while they are still in the waiting room. */
  tableNum: number | null
}

export function hostManagedPlayers(
  roster: readonly { playerId: string; name: string; tableNum: number }[],
  waiting: readonly { id: string; name: string }[] = [],
): HostManagedPlayer[] {
  const seated = new Set(roster.map((player) => player.playerId))
  const rows: HostManagedPlayer[] = [
    ...waiting
      .filter((player) => !seated.has(player.id))
      .map((player) => ({ playerId: player.id, name: player.name, tableNum: null })),
    ...roster.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tableNum: player.tableNum,
    })),
  ]
  return rows.sort((a, b) => {
    const table = (a.tableNum ?? 0) - (b.tableNum ?? 0)
    if (table !== 0) return table
    return a.name.localeCompare(b.name)
  })
}

function destinationFor(player: HostManagedPlayer, chosen: number | undefined): number {
  if (chosen != null) return chosen
  return player.tableNum === 1 ? 2 : 1
}

export function HostPlayersPanel({
  roster,
  waiting = [],
  hostPlayerLabel,
  onRemove,
  onMove,
}: {
  roster: readonly { playerId: string; name: string; tableNum: number }[]
  waiting?: readonly { id: string; name: string }[]
  hostPlayerLabel: (name: string) => string
  onRemove: (playerId: string) => void
  onMove?: (playerId: string, toTableNum: number) => void
}) {
  const players = hostManagedPlayers(roster, waiting)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [destinations, setDestinations] = useState<Record<string, number>>({})
  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/25 p-4"
      aria-label="Players"
    >
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white/45">Players</h2>
      {players.length === 0 ? (
        <p className="mt-3 text-base text-white/50">No one in the room yet.</p>
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {players.map((player) => {
            const label = hostPlayerLabel(player.name)
            const armed = armedId === player.playerId
            const destination = destinationFor(player, destinations[player.playerId])
            return (
              <li
                key={player.playerId}
                className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold text-white">{label}</p>
                  <p className="text-sm text-white/60">
                    {player.tableNum == null ? 'Waiting' : `Table ${player.tableNum}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onMove && player.tableNum != null ? (
                    <>
                      <select
                        aria-label={`Move ${label} to`}
                        value={destination}
                        onChange={(event) =>
                          setDestinations((current) => ({
                            ...current,
                            [player.playerId]: Number(event.target.value),
                          }))
                        }
                        className="min-h-11 rounded-md border border-white/20 bg-zinc-950 px-2 text-sm text-white [color-scheme:dark]"
                      >
                        {Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, index) => index + 1).map((n) => (
                          <option key={n} value={n}>
                            Table {n}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-sky-300/50 px-3 text-sm font-bold text-sky-100"
                        disabled={destination === player.tableNum}
                        onClick={() => onMove(player.playerId, destination)}
                      >
                        Move
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-rose-400/50 px-3 text-sm font-bold text-rose-100"
                    aria-label={armed ? `Remove ${label} from the room` : `Remove ${label}`}
                    onClick={() => {
                      if (!armed) {
                        setArmedId(player.playerId)
                        return
                      }
                      onRemove(player.playerId)
                      setArmedId(null)
                    }}
                  >
                    {armed ? 'Remove them' : 'Remove'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
