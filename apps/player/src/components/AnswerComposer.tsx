import { motion } from 'framer-motion'
import { NumericPlayingCard } from '@qhe/ui'
import type { GameState, PlayerState } from '@qhe/core'
import {
  ANSWER_CARD_COUNT,
  boardHiddenDuringBetting,
  type ComposedAnswer,
  type SelectedCardRef,
} from '../playerModel/answerComposition'
import { PlayerGameButton, PlayerGoldPanel } from './PlayerGoldChrome'

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
    <PlayerGoldPanel title="Compose your answer">
      {gameState.phase === 'betting' ? (
        <p className="player-game-hint">Tap cards to rehearse — submit unlocks when answering opens.</p>
      ) : null}
      {gameState.phase === 'answering' && remainingSec != null ? (
        <p className={`player-game-timer${hideActions ? ' max-lg:hidden' : ''}`}>
          Time left: <strong>{remainingSec}s</strong>
        </p>
      ) : null}

      <div style={{ textAlign: 'center' }}>
        <p className="player-game-question-label">Your answer</p>
        <p className="player-game-hint" style={{ marginTop: '0.35rem' }}>
          Tap exactly {ANSWER_CARD_COUNT} cards; add a decimal if needed. Selected: {selectedCards.length}/
          {ANSWER_CARD_COUNT}
        </p>
        <div className="player-game-answer-display">{composed.display || '—'}</div>
      </div>

      <div className="player-game-card-row" style={{ marginTop: '0.85rem' }}>
        <div className="player-game-card-group">
          <p className="player-game-card-section-label">Hole cards</p>
          <div className="player-game-card-pair">
            {currentPlayer.hand.map((card, i) => {
              const isSelected = selectedCards.some((sc) => sc.type === 'hand' && sc.index === i)
              return (
                <motion.div
                  key={`h-${i}`}
                  className={`cursor-pointer ${isSelected ? 'player-game-card-selected' : ''}`}
                  onClick={() => onSelectCard('hand', i)}
                  whileTap={{ scale: 0.95 }}
                >
                  <NumericPlayingCard
                    digit={card.digit}
                    variant="gold"
                    style="neon"
                    neonVariant={isSelected ? 'pulse' : 'matrix'}
                    size="large"
                  />
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="player-game-card-group">
          <p className="player-game-card-section-label">Board</p>
          <div className="player-game-card-pair">
            {boardHidden
              ? Array.from({ length: 5 }).map((_, i) => (
                  <NumericPlayingCard
                    key={`hidden-${i}`}
                    digit={0}
                    variant="gold"
                    style="neon"
                    size="large"
                    faceDown
                    backDesign="star"
                  />
                ))
              : gameState.round.communityCards.map((card, i) => {
                  const isSelected = selectedCards.some((sc) => sc.type === 'community' && sc.index === i)
                  return (
                    <motion.div
                      key={`c-${i}`}
                      className={`cursor-pointer ${isSelected ? 'player-game-card-selected' : ''}`}
                      onClick={() => onSelectCard('community', i)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <NumericPlayingCard
                        digit={card.digit}
                        variant="gold"
                        style="neon"
                        neonVariant={isSelected ? 'pulse' : 'matrix'}
                        size="large"
                      />
                    </motion.div>
                  )
                })}
          </div>
        </div>

        <div className="player-game-card-group">
          <p className="player-game-card-section-label">Decimal</p>
          <motion.button
            type="button"
            className={`player-game-decimal-btn${composed.display.includes('.') ? ' player-game-decimal-btn--active' : ''}`}
            onClick={onToggleDecimal}
            whileTap={{ scale: 0.95 }}
          >
            .
          </motion.button>
        </div>
      </div>

      {!hideActions ? (
        <div className="player-game-actions player-game-actions--stack" style={{ marginTop: '0.85rem' }}>
          <PlayerGameButton variant="fold" size="large" onClick={onClear}>
            Clear
          </PlayerGameButton>
          <PlayerGameButton variant="gold" size="large" onClick={onSubmit} disabled={!canSubmit}>
            Submit answer
          </PlayerGameButton>
        </div>
      ) : null}
    </PlayerGoldPanel>
  )
}
