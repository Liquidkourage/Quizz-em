import { useEffect, useRef, useState } from 'react'
import type { GameState, PlayerState } from '@qhe/core'
import {
  buildHandSummary,
  captureHandBaseline,
  isHandStartingPhase,
  questionAnswerFromState,
  shouldLatchHandSummary,
  type HandBaseline,
  type HandSummary,
} from '../playerModel/handSummary'

export function useHandSummary(
  gameState: GameState | null,
  currentPlayer: PlayerState | undefined
): HandSummary | null {
  const baselineRef = useRef<HandBaseline | null>(null)
  const foldedRef = useRef(false)
  const lastQuestionAnswerRef = useRef<number | null>(null)
  const prevPhaseRef = useRef<GameState['phase'] | null>(null)
  const [summary, setSummary] = useState<HandSummary | null>(null)

  useEffect(() => {
    if (!gameState || !currentPlayer) return

    const phase = gameState.phase
    const prev = prevPhaseRef.current

    if (currentPlayer.hasFolded) foldedRef.current = true

    const qAnswer = questionAnswerFromState(gameState)
    if (qAnswer != null) lastQuestionAnswerRef.current = qAnswer

    if (prev === 'lobby' && isHandStartingPhase(phase)) {
      baselineRef.current = captureHandBaseline(currentPlayer)
      foldedRef.current = currentPlayer.hasFolded
      setSummary(null)
    } else if (prev != null && isHandStartingPhase(phase) && baselineRef.current == null) {
      baselineRef.current = captureHandBaseline(currentPlayer)
      foldedRef.current = currentPlayer.hasFolded
    }

    if (prev != null && shouldLatchHandSummary(prev, phase) && baselineRef.current) {
      setSummary(
        buildHandSummary({
          baseline: baselineRef.current,
          player: currentPlayer,
          questionAnswer: lastQuestionAnswerRef.current,
          foldedDuringHand: foldedRef.current,
        })
      )
      baselineRef.current = null
      foldedRef.current = false
    }

    if (isHandStartingPhase(phase) && prev !== phase) {
      setSummary(null)
    }

    prevPhaseRef.current = phase
  }, [gameState, currentPlayer])

  return summary
}
