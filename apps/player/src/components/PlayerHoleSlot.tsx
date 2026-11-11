import type { GamePhase, PlayerState } from '@qhe/core'
import { HolePeek } from './HolePeek'
import { holePeekDigits } from '../playerModel/holePeekDigits'

/** Shell slot for the player's own cards. The felt stack must not be an ancestor. */
export function PlayerHoleSlot({
  player,
  phase,
}: {
  player: PlayerState | undefined
  phase: GamePhase
}) {
  const digits = holePeekDigits(player, phase)
  if (!digits) {
    if (phase !== 'question' && phase !== 'betting' && phase !== 'answering') return null
    return <div className="player-hole-slot" aria-hidden />
  }
  return (
    <div className="player-hole-slot">
      <HolePeek digits={digits} />
    </div>
  )
}
