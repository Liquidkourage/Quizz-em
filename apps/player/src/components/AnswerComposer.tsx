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
  onBackspace: () => void
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
  onBackspace,
  onClear,
  onSubmit,
  onEditSubmitted,
}: AnswerComposerProps) {
  const boardDealt = communityBoardDealt(gameState)
  const locked = Boolean(submittedDisplay)
  const canSubmit =
    !locked && selectedCards.length === ANSWER_CARD_COUNT && composed.display.trim().length > 0
  const canBackspace = !locked && (selectedCards.length > 0 || composed.display.length > 0)
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
          {remainingSec > 0 ? (
            <>
              Guide: <strong>{remainingSec}s</strong>
            </>
          ) : (
            <>Suggested time is up — keep editing until the host reveals.</>
          )}
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
              Tap {ANSWER_CARD_COUNT} cards in order; use Backspace to undo. Selected: {selectedCards.length}/
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
                      className={`${isSelected ? 'player-game-card-selected player-game-card-selected--locked' : 'cursor-pointer'}`}
                      onClick={() => {
                        if (!isSelected) onSelectCard('hand', i)
                      }}
                      whileTap={isSelected ? undefined : { scale: 0.95 }}
                      aria-disabled={isSelected || undefined}
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
                        className={`${isSelected ? 'player-game-card-selected player-game-card-selected--locked' : 'cursor-pointer'}`}
                        onClick={() => {
                          if (!isSelected) onSelectCard('community', i)
                        }}
                        whileTap={isSelected ? undefined : { scale: 0.95 }}
                        aria-disabled={isSelected || undefined}
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
              <p className="player-game-card-section-label">Keys</p>
              <div className="player-game-composer-keys">
                <motion.button
                  type="button"
                  className={`player-game-decimal-btn${composed.display.includes('.') ? ' player-game-decimal-btn--active' : ''}`}
                  onClick={onToggleDecimal}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Decimal point"
                >
                  .
                </motion.button>
                <motion.button
                  type="button"
                  className="player-game-backspace-btn"
                  onClick={onBackspace}
                  disabled={!canBackspace}
                  whileTap={canBackspace ? { scale: 0.95 } : undefined}
                  aria-label="Backspace"
                >
                  ⌫
                </motion.button>
              </div>
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
