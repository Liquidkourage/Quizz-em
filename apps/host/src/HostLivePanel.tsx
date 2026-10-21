import type { ReactNode } from 'react'
import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow, HostVenueFloorBriefPayload } from '@qhe/net'
import {
  HostFloorStrip,
  HostLiveStatusLine,
  HostRunBar,
  HostRunProgressDots,
  HostThisHandPanel,
  HostTvBar,
  type HostDockItem,
  type RunOfShowStep,
} from './hostDeskLayout'
import { HostMoreMenu } from './HostMoreMenu'
import { isHostWaitingForJoiners } from './hostDeskLayout'

export function HostLivePanel({
  gameState,
  phaseDockItems,
  runOfShowHeadline,
  pacingUrgency,
  runBarCueHint,
  hostPlayerLabel,
  virtualSeatCount,
  onVenueFloor,
  onLeaderboard,
  onTriviaLeaderboard,
  onSeatingRules,
  venueFeltBeat,
  venueFloorBrief,
  onSpotlight,
  runOfShowSteps,
  handShow,
  handBody,
  moreBody,
  onGoPreShow,
}: {
  gameState: GameState
  phaseDockItems: HostDockItem[]
  runOfShowHeadline: { title: string; detail?: string }
  pacingUrgency: 'now' | 'soon' | 'ready'
  runBarCueHint: string | null
  hostPlayerLabel: (raw: string) => string
  virtualSeatCount: number
  onVenueFloor: () => void
  onLeaderboard: () => void
  onTriviaLeaderboard: () => void
  onSeatingRules: () => void
  venueFeltBeat: HostVenueFeltBeatRow[] | null
  venueFloorBrief: HostVenueFloorBriefPayload | null
  onSpotlight: (n: number) => void
  runOfShowSteps: RunOfShowStep[]
  handShow: boolean
  handBody: ReactNode
  moreBody: ReactNode
  onGoPreShow: () => void
}) {
  const waiting = isHostWaitingForJoiners(gameState)
  const hasSeatedFelts =
    venueFeltBeat != null && venueFeltBeat.some((r) => r.active && r.seated > 0)

  if (waiting || !hasSeatedFelts) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-amber-50">Nothing to run yet</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-amber-100/80">
          Seat players from Pre-show first. The live cue desk appears once tables exist.
        </p>
        <button
          type="button"
          onClick={onGoPreShow}
          className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-50 hover:bg-amber-500/25"
        >
          Back to Pre-show
        </button>
      </div>
    )
  }

  return (
    <>
      <HostRunBar
        items={phaseDockItems}
        headline={runOfShowHeadline}
        pacingUrgency={pacingUrgency}
        cueHint={runBarCueHint}
        statusLine={
          <HostLiveStatusLine
            gameState={gameState}
            hostPlayerLabel={hostPlayerLabel}
            virtualSeatCount={virtualSeatCount}
          />
        }
        tvBar={
          <HostTvBar
            onVenueFloor={onVenueFloor}
            onLeaderboard={onLeaderboard}
            onTriviaLeaderboard={onTriviaLeaderboard}
            onSeatingRules={onSeatingRules}
          />
        }
      />

      <HostFloorStrip
        rows={venueFeltBeat}
        brief={venueFloorBrief}
        onSpotlight={onSpotlight}
      />

      <HostRunProgressDots steps={runOfShowSteps} />

      <HostThisHandPanel title="Right now" show={handShow}>
        {handBody}
      </HostThisHandPanel>

      <HostMoreMenu>{moreBody}</HostMoreMenu>
    </>
  )
}
