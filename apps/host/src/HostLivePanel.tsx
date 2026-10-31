import type { ReactNode } from 'react'
import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow, HostVenueFloorBriefPayload } from '@qhe/net'
import {
  HostFloorStrip,
  HostRunBar,
  HostThisHandPanel,
  HostTvBar,
  type HostDockItem,
  isHostWaitingForJoiners,
} from './hostDeskLayout'
import { HostConnectedDisplays, type HostAttachedDisplay } from './HostConnectedDisplays'

export function HostLivePanel({
  gameState,
  phaseDockItems,
  runOfShowHeadline,
  pacingUrgency,
  runBarCueHint,
  onVenueFloor,
  onLeaderboard,
  onTriviaLeaderboard,
  onSeatingRules,
  venueFeltBeat,
  venueFloorBrief,
  onSpotlight,
  questionSlot,
  handShow,
  handBody,
  floorDetail,
  onGoPreShow,
  attachedDisplays = [],
  onReleaseDisplay,
}: {
  gameState: GameState
  phaseDockItems: HostDockItem[]
  runOfShowHeadline: { title: string; detail?: string }
  pacingUrgency: 'now' | 'soon' | 'ready'
  runBarCueHint: string | null
  onVenueFloor: () => void
  onLeaderboard: () => void
  onTriviaLeaderboard: () => void
  onSeatingRules: () => void
  venueFeltBeat: HostVenueFeltBeatRow[] | null
  venueFloorBrief: HostVenueFloorBriefPayload | null
  onSpotlight: (n: number) => void
  questionSlot?: ReactNode
  handShow: boolean
  handBody: ReactNode
  /** Beat and Now, already open on the live floor. */
  floorDetail?: ReactNode
  onGoPreShow: () => void
  attachedDisplays?: HostAttachedDisplay[]
  onReleaseDisplay?: (socketId: string) => void
}) {
  const waiting = isHostWaitingForJoiners(gameState)
  const hasSeatedFelts =
    venueFeltBeat != null && venueFeltBeat.some((r) => r.active && r.seated > 0)

  if (waiting && !hasSeatedFelts) {
    return (
      <>
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-amber-50">Seat players first</h2>
          <p className="mt-2 max-w-lg text-sm text-amber-100/80">
            Live cues appear after Pre-show seating. More stays open if you need a hard reset.
          </p>
          <button
            type="button"
            onClick={onGoPreShow}
            className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-50 hover:bg-amber-500/25"
          >
            Back to Pre-show
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <HostRunBar
        items={phaseDockItems}
        headline={runOfShowHeadline}
        pacingUrgency={pacingUrgency}
        cueHint={runBarCueHint}
        tvBar={
          <>
            <HostTvBar
              onVenueFloor={onVenueFloor}
              onLeaderboard={onLeaderboard}
              onTriviaLeaderboard={onTriviaLeaderboard}
              onSeatingRules={onSeatingRules}
            />
            <HostConnectedDisplays
              displays={attachedDisplays}
              onRelease={(socketId) => onReleaseDisplay?.(socketId)}
              emptyLabel={false}
            />
          </>
        }
      />

      {questionSlot}

      <HostFloorStrip
        rows={venueFeltBeat}
        brief={venueFloorBrief}
        onSpotlight={onSpotlight}
      />

      {floorDetail}

      <HostThisHandPanel title="Right now" show={handShow}>
        {handBody}
      </HostThisHandPanel>
    </>
  )
}
