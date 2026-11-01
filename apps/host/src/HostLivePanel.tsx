import type { ReactNode } from 'react'
import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import {
  HostAnswerClock,
  HostCollapsible,
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
  onSeatingChart,
  onEliminations,
  onSeatingRules,
  venueFeltBeat,
  questionSlot,
  handShow,
  handBody,
  floorNow,
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
  onSeatingChart?: () => void
  onEliminations?: () => void
  onSeatingRules: () => void
  venueFeltBeat: HostVenueFeltBeatRow[] | null
  questionSlot?: ReactNode
  handShow: boolean
  handBody: ReactNode
  /** Venue floor · now, already open. */
  floorNow?: ReactNode
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
    <div className="host-live-board grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2 sm:grid-rows-[auto_auto_auto_minmax(0,1fr)]">
      <div className="min-w-0 sm:col-start-1 sm:row-start-1">
        <HostRunBar
          items={phaseDockItems}
          headline={runOfShowHeadline}
          pacingUrgency={pacingUrgency}
          cueHint={runBarCueHint}
        />
      </div>

      <div className="flex items-start self-start sm:col-start-2 sm:row-start-1">
        <div className="w-full max-w-[16rem]">
        <HostCollapsible summary="Audience TVs" appearance="button">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <HostTvBar
              onVenueFloor={onVenueFloor}
              onLeaderboard={onLeaderboard}
              onTriviaLeaderboard={onTriviaLeaderboard}
              onSeatingChart={onSeatingChart}
              onEliminations={onEliminations}
              onSeatingRules={onSeatingRules}
            />
            <HostConnectedDisplays
              displays={attachedDisplays}
              onRelease={(socketId) => onReleaseDisplay?.(socketId)}
              emptyLabel={false}
            />
          </div>
        </HostCollapsible>
        </div>
      </div>

      <div className="flex min-w-0 items-start gap-2 sm:col-span-2 sm:row-start-2">
        <div className="min-w-0 flex-1">{questionSlot}</div>
        <HostAnswerClock rows={venueFeltBeat} />
      </div>

      <div className="min-w-0 sm:col-span-2 sm:row-start-3">
        <HostThisHandPanel title="Right now" show={handShow}>
          {handBody}
        </HostThisHandPanel>
      </div>

      <div className="min-h-0 max-h-full self-start overflow-y-auto sm:col-span-2 sm:row-start-4">{floorNow}</div>
    </div>
  )
}
