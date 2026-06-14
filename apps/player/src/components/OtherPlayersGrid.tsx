import { motion } from 'framer-motion'
import { Card, NumericPlayingCard } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

type OtherPlayersGridProps = {
  gameState: GameState
  playerName: string
}

export default function OtherPlayersGrid({ gameState, playerName }: OtherPlayersGridProps) {
  const others = gameState.players.filter((p) => p.name !== playerName)
  if (others.length === 0) return null

  const showSeat = (gameState.tableId ?? '') !== LOBBY_TABLE_ID
  const showCards = gameState.phase === 'showdown' || gameState.phase === 'reveal'

  return (
    <Card variant="glass" className="mt-4 p-4 sm:mt-6 sm:p-6">
      <h2 className="mb-4 text-center text-xl font-bold text-casino-emerald sm:text-2xl">Table</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {others.map((player) => {
          const seatNum = gameState.players.findIndex((p) => p.id === player.id) + 1
          return (
            <motion.div
              key={player.id}
              className="rounded-lg border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {showSeat && seatNum > 0 ? (
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-white/55">Seat {seatNum}</div>
              ) : null}
              <div className="truncate text-sm font-bold text-casino-emerald">{player.name}</div>
              <div className="text-lg font-bold text-casino-gold">${player.bankroll}</div>
              {player.hasFolded ? <div className="text-xs font-bold text-red-400">Folded</div> : null}
              {player.hand.length > 0 ? (
                <div className="mt-2 flex justify-center gap-1">
                  {player.hand.map((card, i) => (
                    <NumericPlayingCard
                      key={i}
                      digit={card.digit}
                      variant="purple"
                      size="small"
                      faceDown={!showCards || player.hasFolded}
                      backDesign="star"
                    />
                  ))}
                </div>
              ) : null}
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
