import type { GamePhase, PlayerState } from '@qhe/core'

/** Hole cards while they are still hidden. Reveal and showdown draw the faces on the felt. */
export function holePeekDigits(
  player: PlayerState | undefined,
  phase: GamePhase,
): readonly [number, number] | null {
  const first = player?.hand[0]
  const second = player?.hand[1]
  if (!first || !second) return null
  if (phase === 'reveal' || phase === 'showdown') return null
  return [first.digit, second.digit]
}
