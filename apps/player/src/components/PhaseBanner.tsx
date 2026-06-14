import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

type PhaseBannerProps = {
  gameState: GameState
}

export default function PhaseBanner({ gameState }: PhaseBannerProps) {
  const { phase, tableId } = gameState

  if (tableId === LOBBY_TABLE_ID && phase === 'lobby') {
    return (
      <div className="mx-auto mb-4 max-w-xl rounded-xl border border-amber-400/50 bg-amber-950/35 px-3 py-3 text-center text-xs text-amber-100 sm:mb-6 sm:text-sm">
        Lobby pool — the host will assign you to a table when they tap <strong>Assign from lobby</strong>.
      </div>
    )
  }

  if (phase === 'lobby' && tableId !== LOBBY_TABLE_ID) {
    return (
      <div className="mx-auto mb-4 max-w-xl rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-3 py-3 text-center text-xs text-emerald-100 sm:mb-6 sm:text-sm">
        Hand complete — waiting for the host to reveal the next question.
      </div>
    )
  }

  if (phase === 'question') {
    return (
      <div className="mx-auto mb-4 max-w-xl rounded-xl border border-casino-gold/40 bg-black/35 px-3 py-3 text-center text-xs text-white/80 sm:text-sm">
        Hole cards dealt — the host will reveal the trivia question to open wagering.
      </div>
    )
  }

  if (phase === 'reveal') {
    return (
      <div className="mx-auto mb-4 max-w-xl rounded-xl border border-purple-400/40 bg-purple-950/30 px-3 py-3 text-center text-xs text-purple-100 sm:text-sm">
        Answers revealed — compare guesses before the host pays out the pot.
      </div>
    )
  }

  if (phase === 'showdown' || phase === 'payout') {
    return (
      <div className="mx-auto mb-4 max-w-xl rounded-xl border border-emerald-400/40 bg-emerald-950/25 px-3 py-3 text-center text-xs text-emerald-100 sm:text-sm">
        Showdown — chips and trivia points are being settled.
      </div>
    )
  }

  if (phase === 'intermission') {
    return (
      <div className="mx-auto mb-4 max-w-xl rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-center text-xs text-white/70 sm:text-sm">
        Intermission — stand by for the next round.
      </div>
    )
  }

  return null
}
