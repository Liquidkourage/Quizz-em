import { useEffect, useState } from 'react'
import { NeonButton } from '@qhe/ui'
import type { HostVenueFloorBriefPayload } from '@qhe/net'

export function HostRoomControls({
  brief,
  onShuffleEvery,
  onSkipNextShuffle,
  onShuffleNow,
}: {
  brief: HostVenueFloorBriefPayload | null
  onShuffleEvery: (every: number) => void
  onSkipNextShuffle: (skip: boolean) => void
  onShuffleNow: () => void
}) {
  const [every, setEvery] = useState(brief?.shuffleEveryHands ?? 5)

  useEffect(() => {
    if (brief?.shuffleEveryHands) setEvery(brief.shuffleEveryHands)
  }, [brief?.shuffleEveryHands])

  const shuffleLine =
    brief?.handsUntilShuffle == null
      ? 'One table — no re-seat.'
      : brief.venueShuffleHeld
        ? `Next re-seat is held. Tables stay for ${brief.handsUntilShuffle} hands.`
        : `Re-seat in ${brief.handsUntilShuffle} hands.`

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">Re-seat</h3>
        <p className="mt-1 text-sm text-white/70">{shuffleLine}</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/45">
            Every
            <input
              type="number"
              min={1}
              max={20}
              aria-label="Hands between re-seats"
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
            {brief?.venueShuffleHeld ? 'Resume re-seat' : 'Keep these tables'}
          </NeonButton>
          <NeonButton variant="blue" size="small" onClick={onShuffleNow}>
            Re-seat now
          </NeonButton>
        </div>
      </div>
    </section>
  )
}
