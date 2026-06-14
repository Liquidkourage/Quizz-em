import { motion } from 'framer-motion'
import { Card, NeonButton, NumericPlayingCard } from '@qhe/ui'
import type { GameState, PlayerState } from '@qhe/core'
import {
  ANSWER_CARD_COUNT,
  boardHiddenDuringBetting,
  type ComposedAnswer,
  type SelectedCardRef,
} from '../playerModel/answerComposition'

type AnswerComposerProps = {
  gameState: GameState
  currentPlayer: PlayerState
  composed: ComposedAnswer
  selectedCards: SelectedCardRef[]
  remainingSec: number | null
  hideActions?: boolean
  onSelectCard: (type: 'hand' | 'community', index: number) => void
  onToggleDecimal: () => void
  onClear: () => void
  onSubmit: () => void
}

export default function AnswerComposer({
  gameState,
  currentPlayer,
  composed,
  selectedCards,
  remainingSec,
  hideActions,
  onSelectCard,
  onToggleDecimal,
  onClear,
  onSubmit,
}: AnswerComposerProps) {
  const boardHidden = boardHiddenDuringBetting(gameState)
  const canSubmit =
    gameState.phase === 'answering' &&
    selectedCards.length === ANSWER_CARD_COUNT &&
    composed.display.trim().length > 0

  return (
    <Card variant="glass" className="mb-4 space-y-4 p-4 sm:mb-6 sm:p-6">
      <h2 className="text-center text-2xl font-bold text-casino-emerald sm:text-3xl">Compose your answer</h2>
      {gameState.phase === 'betting' ? (
        <p className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-center text-xs leading-snug text-white/60">
          Tap cards to rehearse — submit unlocks when answering opens.
        </p>
      ) : null}
      {gameState.phase === 'answering' && remainingSec != null ? (
        <div className={`text-center ${hideActions ? '' : 'hidden sm:block'}`}>
          <span className="mr-2 text-white/80">Time left:</span>
          <span className="text-2xl font-extrabold tabular-nums text-casino-gold">{remainingSec}s</span>
        </div>
      ) : null}

      <div className="text-center">
        <div className="mb-1 text-sm text-white/80">Your answer</div>
        <div className="mb-2 text-xs text-casino-emerald/95">
          Tap exactly {ANSWER_CARD_COUNT} cards; add a decimal if needed.
        </div>
        <div className="mb-2 text-xs text-white/70">
          Selected: {selectedCards.length}/{ANSWER_CARD_COUNT}
        </div>
        <div className="flex min-h-[5rem] items-center justify-center break-all rounded-lg border border-white/20 bg-white/10 px-2 py-3 text-3xl font-bold text-casino-gold sm:min-h-[6rem] sm:text-5xl">
          {composed.display || '—'}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <div className="flex flex-col items-center">
          <div className="mb-2 text-xs font-bold uppercase text-casino-gold">Hole cards</div>
          <div className="flex gap-2">
            {currentPlayer.hand.map((card, i) => {
              const isSelected = selectedCards.some((sc) => sc.type === 'hand' && sc.index === i)
              return (
                <motion.div
                  key={`h-${i}`}
                  className={`cursor-pointer ${isSelected ? 'ring-4 ring-casino-gold rounded-xl' : ''}`}
                  onClick={() => onSelectCard('hand', i)}
                  whileTap={{ scale: 0.95 }}
                >
                  <NumericPlayingCard
                    digit={card.digit}
                    variant="cyan"
                    style="neon"
                    neonVariant={isSelected ? 'pulse' : 'matrix'}
                    size="large"
                  />
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="mb-2 text-xs font-bold uppercase text-casino-emerald">Board</div>
          <div className="flex gap-2">
            {boardHidden
              ? Array.from({ length: 5 }).map((_, i) => (
                  <NumericPlayingCard key={`hidden-${i}`} digit={0} variant="cyan" style="neon" size="large" faceDown backDesign="star" />
                ))
              : gameState.round.communityCards.map((card, i) => {
                  const isSelected = selectedCards.some((sc) => sc.type === 'community' && sc.index === i)
                  return (
                    <motion.div
                      key={`c-${i}`}
                      className={`cursor-pointer ${isSelected ? 'ring-4 ring-casino-gold rounded-xl' : ''}`}
                      onClick={() => onSelectCard('community', i)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <NumericPlayingCard
                        digit={card.digit}
                        variant="cyan"
                        style="neon"
                        neonVariant={isSelected ? 'pulse' : 'matrix'}
                        size="large"
                      />
                    </motion.div>
                  )
                })}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="mb-2 text-xs font-bold uppercase text-purple-400">Decimal</div>
          <motion.button
            type="button"
            className={`flex h-24 w-16 items-center justify-center rounded-xl border-2 text-3xl font-bold ${
              composed.display.includes('.')
                ? 'border-casino-gold bg-purple-950/60 text-purple-200 ring-4 ring-casino-gold'
                : 'border-purple-500/70 bg-black/80 text-purple-300'
            }`}
            onClick={onToggleDecimal}
            whileTap={{ scale: 0.95 }}
          >
            .
          </motion.button>
        </div>
      </div>

      {!hideActions ? (
        <div className="flex justify-center gap-4">
          <NeonButton variant="red" size="large" onClick={onClear}>
            Clear
          </NeonButton>
          <NeonButton variant="emerald" size="large" onClick={onSubmit} disabled={!canSubmit}>
            Submit answer
          </NeonButton>
        </div>
      ) : null}
    </Card>
  )
}
