import { useEffect, useState } from 'react'
import { NeonButton } from '@qhe/ui'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { HostVenueFloorBriefPayload } from '@qhe/net'

export function HostRoomControls({
  brief,
  hostPlayerLabel,
  onMove,
  onRemove,
  onShuffleEvery,
  onSkipNextShuffle,
  onShuffleNow,
}: {
  brief: HostVenueFloorBriefPayload | null
  hostPlayerLabel: (raw: string) => string
  onMove: (playerId: string, toTableNum: number) => void
  onRemove: (playerId: string) => void
  onShuffleEvery: (every: number) => void
  onSkipNextShuffle: (skip: boolean) => void
  onShuffleNow: () => void
}) {
  const roster = brief?.roster ?? []
  const [playerId, setPlayerId] = useState('')
  const [toTable, setToTable] = useState(1)
  const [removeArmed, setRemoveArmed] = useState(false)
  const [every, setEvery] = useState(brief?.shuffleEveryHands ?? 5)

  useEffect(() => {
    if (brief?.shuffleEveryHands) setEvery(brief.shuffleEveryHands)
  }, [brief?.shuffleEveryHands])

  useEffect(() => {
    if (roster.length === 0) return
    if (!roster.some((seat) => seat.playerId === playerId)) {
      setPlayerId(roster[0]!.playerId)
    }
  }, [roster, playerId])

  useEffect(() => {
    setRemoveArmed(false)
  }, [playerId])

  const selected = roster.find((seat) => seat.playerId === playerId) ?? null
  const counts = new Map<number, number>()
  for (const seat of roster) counts.set(seat.tableNum, (counts.get(seat.tableNum) ?? 0) + 1)

  const shuffleLine =
    brief?.handsUntilShuffle == null
      ? 'One table — no shuffle.'
      : brief.venueShuffleHeld
        ? `Next shuffle is held. Tables stay for ${brief.handsUntilShuffle} hands.`
        : `Shuffle in ${brief.handsUntilShuffle} hands.`

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">Move a player</h3>
        <p className="mt-1 text-xs text-white/50">Any seated player. Between hands, when every table is waiting.</p>
        {roster.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">No one is seated yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/45">
              Player
              <select
                aria-label="Player to move"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="max-w-[16rem] rounded-lg border border-white/20 bg-zinc-950 py-2 pl-2 pr-8 text-sm font-semibold normal-case tracking-normal text-white [color-scheme:dark]"
              >
                {roster.map((seat) => (
                  <option key={seat.playerId} value={seat.playerId} className="bg-zinc-950 text-white">
                    {hostPlayerLabel(seat.name)} · Table {seat.tableNum}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/45">
              To table
              <select
                aria-label="Destination table"
                value={toTable}
                onChange={(e) => setToTable(Number(e.target.value))}
                className="rounded-lg border border-white/20 bg-zinc-950 py-2 pl-2 pr-8 text-sm font-semibold normal-case tracking-normal text-white [color-scheme:dark]"
              >
                {Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, index) => {
                  const n = index + 1
                  const seated = counts.get(n) ?? 0
                  return (
                    <option key={n} value={n} className="bg-zinc-950 text-white">
                      Table {n}
                      {seated > 0 ? ` (${seated})` : ' (empty)'}
                    </option>
                  )
                })}
              </select>
            </label>
            <NeonButton
              variant="blue"
              size="small"
              disabled={!selected || selected.tableNum === toTable}
              onClick={() => {
                if (!selected || selected.tableNum === toTable) return
                onMove(selected.playerId, toTable)
              }}
            >
              Move
            </NeonButton>
            <NeonButton
              variant="red"
              size="small"
              disabled={!selected}
              onClick={() => {
                if (!selected) return
                if (!removeArmed) {
                  setRemoveArmed(true)
                  return
                }
                onRemove(selected.playerId)
                setRemoveArmed(false)
              }}
            >
              {removeArmed ? 'Remove them' : 'Remove'}
            </NeonButton>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">Table shuffle</h3>
        <p className="mt-1 text-sm text-white/70">{shuffleLine}</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/45">
            Every
            <input
              type="number"
              min={1}
              max={20}
              aria-label="Hands between shuffles"
              value={every}
              onChange={(e) => {
                const next = Math.floor(Number(e.target.value))
                if (!Number.isFinite(next)) return
                setEvery(Math.min(20, Math.max(1, next)))
              }}
              className="w-16 rounded-md border border-white/20 bg-black/50 px-2 py-2 text-center font-mono text-base text-white"
            />
          </label>
          <NeonButton variant="gold" size="small" onClick={() => onShuffleEvery(every)}>
            Save cadence
          </NeonButton>
          <NeonButton
            variant="purple"
            size="small"
            onClick={() => onSkipNextShuffle(!(brief?.venueShuffleHeld === true))}
          >
            {brief?.venueShuffleHeld ? 'Put shuffle back' : 'Keep these tables'}
          </NeonButton>
          <NeonButton variant="blue" size="small" onClick={onShuffleNow}>
            Shuffle now
          </NeonButton>
        </div>
      </div>
    </section>
  )
}
