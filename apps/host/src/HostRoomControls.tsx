import { NeonButton } from '@qhe/ui'
import type { HostVenueFloorBriefPayload } from '@qhe/net'

export function HostRoomControls({
  onShuffleNow,
}: {
  brief: HostVenueFloorBriefPayload | null
  onShuffleEvery: (every: number) => void
  onSkipNextShuffle: (skip: boolean) => void
  onShuffleNow: () => void
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">TABLE SHUFFLE</h3>
        <p className="mt-1 text-sm text-white/70">
          Tables balance between hands. A crowded table sends its next big blind to a short one.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <NeonButton variant="blue" size="small" onClick={onShuffleNow}>
            TABLE SHUFFLE
          </NeonButton>
        </div>
      </div>
    </section>
  )
}
