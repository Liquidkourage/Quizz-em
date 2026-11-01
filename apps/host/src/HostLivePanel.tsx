import type { ReactNode } from 'react'
import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow, VenueWallViewMode } from '@qhe/net'
import {
  HostAnswerClock,
  HostRunBar,
  HostTvBar,
  type HostDockItem,
  isHostWaitingForJoiners,
} from './hostDeskLayout'

export function HostLivePanel({
  gameState,
  phaseDockItems,
  runOfShowHeadline,
  pacingUrgency,
  runBarCueHint,
  onVenueFloor,
  onLeaderboard,
  onTriviaLeaderboard,
  onSeatingChart,
  onEliminations,
  onSeatingRules,
  activeView = 'floor',
  venueFeltBeat,
  questionSlot,
  handBody,
  floorNow,
  onGoPreShow,
}: {
  gameState: GameState
  phaseDockItems: HostDockItem[]
  runOfShowHeadline: { title: string; detail?: string }
  pacingUrgency: 'now' | 'soon' | 'ready'
  runBarCueHint: string | null
  onVenueFloor: () => void
  onLeaderboard: () => void
  onTriviaLeaderboard: () => void
  onSeatingChart?: () => void
  onEliminations?: () => void
  onSeatingRules: () => void
  /** Public display mode currently on the audience TVs. */
  activeView?: VenueWallViewMode
  venueFeltBeat: HostVenueFeltBeatRow[] | null
  questionSlot?: ReactNode
  handBody: ReactNode
  /** Venue floor · now, already open. */
  floorNow?: ReactNode
  onGoPreShow: () => void
}) {
  const waiting = isHostWaitingForJoiners(gameState)
  const hasSeatedFelts =
    venueFeltBeat != null && venueFeltBeat.some((r) => r.active && r.seated > 0)

  if (waiting && !hasSeatedFelts) {
    return (
      <>
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-amber-50">Seat players first</h2>
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
    <div className="host-live-board grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2 sm:grid-rows-[auto_auto_minmax(0,1fr)]">
      <div className="min-w-0 sm:col-start-1 sm:row-start-1">
        <HostRunBar
          items={phaseDockItems}
          headline={runOfShowHeadline}
          pacingUrgency={pacingUrgency}
          cueHint={runBarCueHint}
        />
        {handBody}
      </div>

      <div className="min-w-0 self-start sm:col-start-2 sm:row-start-1">
        <HostTvBar
          activeView={activeView}
          onVenueFloor={onVenueFloor}
          onLeaderboard={onLeaderboard}
          onTriviaLeaderboard={onTriviaLeaderboard}
          onSeatingChart={onSeatingChart}
          onEliminations={onEliminations}
          onSeatingRules={onSeatingRules}
        />
      </div>

      <div className="flex min-w-0 items-start gap-2 sm:col-span-2 sm:row-start-2">
        <div className="min-w-0 flex-1">{questionSlot}</div>
        <HostAnswerClock rows={venueFeltBeat} />
      </div>

      <div className="min-h-0 max-h-full self-start overflow-y-auto sm:col-span-2 sm:row-start-3">{floorNow}</div>
    </div>
  )
}
