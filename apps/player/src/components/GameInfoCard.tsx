import { Card, NumericPlayingCard } from '@qhe/ui'
import type { GameState, PlayerState } from '@qhe/core'
import { formatTriviaNumber } from '@qhe/core'

type GameInfoCardProps = {
  gameState: GameState
  currentPlayer: PlayerState | undefined
}

export default function GameInfoCard({ gameState, currentPlayer }: GameInfoCardProps) {
  const q = gameState.round.question

  return (
    <Card variant="glass" className="mb-4 p-4 sm:mb-6 sm:p-6">
      <div className="mb-4 text-center sm:mb-5">
        <div className="text-sm text-white/80 sm:text-base">Pot</div>
        <div className="text-3xl font-bold text-casino-emerald sm:text-4xl">${gameState.round.pot}</div>
      </div>
      {q ? (
        <div className="mx-auto max-w-2xl rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-5">
          <div className="mb-2 text-sm text-white/80">Question</div>
          <div className="text-base font-bold text-casino-gold sm:text-lg">{q.text}</div>
          {(gameState.phase === 'showdown' || gameState.phase === 'reveal') && (
            <div className="mt-3 text-lg font-bold text-casino-emerald">
              Answer: {formatTriviaNumber(q.answer)}
            </div>
          )}
        </div>
      ) : null}
      {gameState.phase === 'question' &&
        currentPlayer &&
        currentPlayer.hand.length >= 2 &&
        !currentPlayer.hasFolded && (
          <div className="mx-auto mt-4 max-w-md rounded-lg border border-casino-gold/35 bg-black/30 p-4 text-center sm:p-5">
            <div className="mb-3 text-sm font-bold uppercase tracking-wide text-casino-gold">Your hole cards</div>
            <div className="flex justify-center gap-3">
              {currentPlayer.hand.map((card, i) => (
                <NumericPlayingCard key={i} digit={card.digit} variant="gold" style="neon" neonVariant="pulse" size="large" />
              ))}
            </div>
          </div>
        )}
    </Card>
  )
}
