import type { GamePhase, PlayerState } from '@qhe/core'
import { HolePeek } from './HolePeek'
import { holePeekDigits } from '../playerModel/holePeekDigits'

/** Shell slot for the player's own cards. The felt stack must not be an ancestor. */
export function PlayerHoleSlot({
  player,
  phase,
  reserve = false,
}: {
  player: PlayerState | undefined
  phase: GamePhase
  /** Keep the card row while the felt is up, before the cards exist. */
  reserve?: boolean
}) {
  const digits = holePeekDigits(player, phase)
  if (!digits) {
    if (!reserve && phase !== 'question' && phase !== 'betting' && phase !== 'answering') return null
    return <div className="player-hole-slot" aria-hidden />
  }
  return (
    <div className="player-hole-slot">
      <HolePeek digits={digits} />
    </div>
  )
}
