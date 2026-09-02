import { motion } from 'framer-motion'
import { NumericPlayingCard } from '@qhe/ui'
import type { GameState, PlayerState } from '@qhe/core'
import {
  ANSWER_CARD_COUNT,
  communityBoardDealt,
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
  submittedDisplay?: string | null
  onSelectCard: (type: 'hand' | 'community', index: number) => void
  onToggleDecimal: () => void
  onClear: () => void
  onSubmit: () => void
  onEditSubmitted?: () => void
}

export default function AnswerComposer({
  gameState,
  currentPlayer,
  composed,
  selectedCards,
  remainingSec,
  submittedDisplay,
  onSelectCard,
  onToggleDecimal,
  onClear,
  onSubmit,
  onEditSubmitted,
}: AnswerComposerProps) {
  const boardDealt = communityBoardDealt(gameState)
  const locked = Boolean(submittedDisplay)
  const canSubmit =
    !locked && selectedCards.length === ANSWER_CARD_COUNT && composed.display.trim().length > 0
  const questionText = gameState.round.question?.text

  return (
    <PlayerGoldPanel title="Compose your answer">
      {questionText ? (
        <div className="player-game-answer-question">
          <p className="player-game-question-label">Question</p>
          <p className="player-game-question-text">{questionText}</p>
        </div>
      ) : null}

      {remainingSec != null ? (
        <p className="player-game-timer">
          Time left: <strong>{remainingSec}s</strong>
        </p>
      ) : null}

      {locked ? (
        <div className="player-game-answer-submitted" role="status">
          <p className="player-game-question-label">Submitted</p>
          <div className="player-game-answer-display player-game-answer-display--locked">{submittedDisplay}</div>
          <p className="player-game-hint">Locked in. You can edit before time runs out.</p>
          {onEditSubmitted ? (
            <PlayerGameButton variant="dark" size="large" className="player-game-btn--block" onClick={onEditSubmitted}>
              Edit answer
            </PlayerGameButton>
          ) : null}
        </div>
      ) : (
        <>
          <div className="player-game-answer-block">
            <p className="player-game-question-label">Your answer</p>
            <p className="player-game-hint player-game-hint--composer">
              Tap exactly {ANSWER_CARD_COUNT} cards; add a decimal if needed. Selected: {selectedCards.length}/
              {ANSWER_CARD_COUNT}
            </p>
            <div className="player-game-answer-display">{composed.display || '—'}</div>
          </div>

          <div className="player-game-card-row player-game-card-row--composer">
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
                        size="normal"
                        compact
                      />
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <div className="player-game-card-group">
              <p className="player-game-card-section-label">Board</p>
              {boardDealt ? (
                <div className="player-game-card-pair">
                  {gameState.round.communityCards.map((card, i) => {
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
                          size="normal"
                          compact
                        />
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="player-game-board-pending" aria-label="Community cards not dealt yet">
                  <p className="player-game-board-pending-title">Board not ready</p>
                  <p className="player-game-board-pending-detail">Community cards should be dealt before answering.</p>
                </div>
              )}
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

          <div className="player-game-actions player-game-actions--stack player-game-actions--composer">
            <PlayerGameButton variant="fold" size="large" onClick={onClear}>
              Clear
            </PlayerGameButton>
            <PlayerGameButton variant="gold" size="large" onClick={onSubmit} disabled={!canSubmit}>
              Submit answer
            </PlayerGameButton>
          </div>
        </>
      )}
    </PlayerGoldPanel>
  )
}
