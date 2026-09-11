import { useEffect, useRef, useState } from 'react'
import type { GameState } from '@qhe/core'
import {
  buildTableResults,
  shouldClearTableResults,
  type TableResults,
} from '../playerModel/tableResults'
import { isPostHandPhase } from '../playerModel/handSummary'

/**
 * Live table results during reveal/showdown/payout; latched into lobby until the next hand.
 * Snapshot is refreshed continuously during post-hand so lobby still has answers after endRound clears them.
 */
export function useTableResults(
  gameState: GameState | null,
  myPlayerId: string | null | undefined,
): TableResults | null {
  const prevPhaseRef = useRef<GameState['phase'] | null>(null)
  const [latched, setLatched] = useState<TableResults | null>(null)

  useEffect(() => {
    if (!gameState) return

    const phase = gameState.phase
    const prev = prevPhaseRef.current

    if (shouldClearTableResults(prev, phase)) {
      setLatched(null)
    }

    if (isPostHandPhase(phase)) {
      const live = buildTableResults(gameState, myPlayerId)
      if (live) setLatched(live)
    }

    prevPhaseRef.current = phase
  }, [gameState, myPlayerId])

  if (!gameState) return null

  if (isPostHandPhase(gameState.phase)) {
    return buildTableResults(gameState, myPlayerId) ?? latched
  }

  if (gameState.phase === 'lobby') {
    return latched
  }

  return null
}
