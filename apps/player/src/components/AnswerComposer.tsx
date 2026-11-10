import type { ReactNode } from 'react'
import { cardsInDigitOrder, NumericPlayingCard } from '@qhe/ui'
import { formatTriviaPoints, type GameState, type NumericCard, type PlayerState } from '@qhe/core'
import {
  ANSWER_CARD_COUNT,
  communityBoardDealt,
  type ComposedAnswer,
  type SelectedCardRef,
} from '../playerModel/answerComposition'
import { PlayerGameButton, PlayerGoldPanel } from './PlayerGoldChrome'
import { MISSED_GUESS_LINE } from './PlayerForfeitStrip'

type AnswerComposerProps = {
  gameState: GameState
  currentPlayer: PlayerState
  composed: ComposedAnswer
  selectedCards: SelectedCardRef[]
  remainingSec: number | null
  /** Host nudge. Present only for a seat that has not locked a guess. */
  nudgeRemainingSec?: number | null
  submittedDisplay?: string | null
  onSelectCard: (type: 'hand' | 'community', index: number) => void
  onToggleDecimal: () => void
  onBackspace: () => void
  onClear: () => void
  onSubmit: () => void
  onEditSubmitted?: () => void
  /** All-in runout: lock a guess before the host opens the clock. */
  preload?: boolean
}

function answerClockUrgent(remainingSec: number): boolean {
  return remainingSec > 0 && remainingSec <= 10
}

function lockedAnswerHint(remainingSec: number | null): string {
  if (remainingSec === 0) return 'Locked in.'
  return 'Locked in. You can edit before time runs out.'
}

function NudgeLockClock({
  forfeited,
  seconds,
}: {
  forfeited: boolean
  seconds: number | null | undefined
}) {
  if (forfeited || seconds == null) return null
  return (
    <p className="player-game-hint" role="status">
      Lock a guess <strong>{seconds}</strong>
    </p>
  )
}

function AnswerRail({ digits }: { digits: ComposedAnswer['digits'] }) {
  const filled = digits.filter((token) => token !== 'decimal').length
  const empties = ANSWER_CARD_COUNT - filled
  return (
    <div className="player-compose-rail" aria-label="Your answer">
      {digits.map((token, index) =>
        token === 'decimal' ? (
          <span key={`dot-${index}`} className="player-compose-dot" aria-hidden>
            .
          </span>
        ) : (
          <span key={`digit-${index}`} className="player-compose-slot player-compose-slot--filled">
            {token}
          </span>
        ),
      )}
      {Array.from({ length: empties }, (_, index) => (
        <span key={`empty-${index}`} className="player-compose-slot player-compose-slot--empty" />
      ))}
    </div>
  )
}

function ComposeCard({
  digit,
  used,
  onPick,
}: {
  digit: number
  used: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className={used ? 'player-compose-card player-compose-card--used' : 'player-compose-card'}
      onClick={onPick}
      disabled={used}
      aria-label={`Card ${digit}`}
    >
      <NumericPlayingCard digit={digit} size="small" compact />
    </button>
  )
}

function CardGroup({
  label,
  cards,
  selected,
  source,
  onSelectCard,
  cardsClassName,
  trailing,
}: {
  label: string
  cards: { card: NumericCard; index: number }[]
  selected: SelectedCardRef[]
  source: 'hand' | 'community'
  onSelectCard: (type: 'hand' | 'community', index: number) => void
  cardsClassName?: string
  trailing?: ReactNode
}) {
  const cardsClass = cardsClassName ? `player-compose-cards ${cardsClassName}` : 'player-compose-cards'
  return (
    <div className="player-compose-group">
      <p className="player-compose-label">{label}</p>
      <div className="player-compose-hand">
        <div className={cardsClass}>
          {cards.map(({ card, index }) => (
            <ComposeCard
              key={`${source}-${index}`}
              digit={card.digit}
              used={selected.some((pick) => pick.type === source && pick.index === index)}
              onPick={() => onSelectCard(source, index)}
            />
          ))}
        </div>
        {trailing}
      </div>
    </div>
  )
}

function composerTitle(pointsOnly: boolean, preload: boolean): string {
  if (preload) return 'Pre-load your answer'
  if (pointsOnly) return 'Second life · Compose for points'
  return 'Compose your answer'
}

function ComposerStatus({
  gameState,
  currentPlayer,
  remainingSec,
  nudgeRemainingSec,
  preload,
}: AnswerComposerProps) {
  const questionText = gameState.round.question?.text
  const forfeited = currentPlayer.answerForfeited === true
  return (
    <>
      {currentPlayer.pointsOnly === true ? (
        <div className="player-game-answer-second-life" role="status">
          <p className="player-game-question-label">Points only</p>
          <p className="player-game-hint">
            Chip contest over — this guess still earns trivia points (
            <strong>{formatTriviaPoints(currentPlayer.answerPoints ?? 0)}</strong> so far).
          </p>
        </div>
      ) : null}
      {preload ? (
        <p className="player-game-hint" role="status">
          Everyone still in the chips is all-in. Lock your guess now — the host still starts the clock.
        </p>
      ) : null}
      {questionText ? (
        <div className="player-game-answer-question player-compose-question">
          <p className="player-game-question-label">Question</p>
          <p className="player-game-question-text">{questionText}</p>
        </div>
      ) : null}
      {forfeited ? (
        <p className="player-game-hint" role="status">
          {MISSED_GUESS_LINE}
        </p>
      ) : remainingSec != null ? (
        <AnswerClock remainingSec={remainingSec} />
      ) : null}
      <NudgeLockClock forfeited={forfeited} seconds={nudgeRemainingSec} />
    </>
  )
}

function AnswerClock({ remainingSec }: { remainingSec: number }) {
  const urgent = answerClockUrgent(remainingSec) ? ' player-game-timer--urgent' : ''
  return (
    <p className={`player-game-timer${urgent}`} aria-live="polite">
      {remainingSec > 0 ? (
        <>
          Time <strong>{remainingSec}</strong>
        </>
      ) : (
        <>Time is up.</>
      )}
    </p>
  )
}

function LockedAnswer({
  submittedDisplay,
  remainingSec,
  onEditSubmitted,
}: {
  submittedDisplay: string
  remainingSec: number | null
  onEditSubmitted?: () => void
}) {
  return (
    <div className="player-compose-locked" role="status">
      <p className="player-game-question-label">Submitted</p>
      <p className="player-compose-locked-num">{submittedDisplay}</p>
      <p className="player-game-hint">{lockedAnswerHint(remainingSec)}</p>
      {onEditSubmitted ? (
        <PlayerGameButton variant="dark" size="large" className="player-game-btn--block" onClick={onEditSubmitted}>
          Edit answer
        </PlayerGameButton>
      ) : null}
    </div>
  )
}

function SharedCards({
  gameState,
  selectedCards,
  onSelectCard,
}: Pick<AnswerComposerProps, 'gameState' | 'selectedCards' | 'onSelectCard'>) {
  if (!communityBoardDealt(gameState)) {
    return (
      <div className="player-compose-group">
        <p className="player-compose-label">Shared cards</p>
        <div className="player-game-board-pending" aria-label="Community cards not dealt yet">
          <p className="player-game-board-pending-title">Board not ready</p>
          <p className="player-game-board-pending-detail">Community cards should be dealt before answering.</p>
        </div>
      </div>
    )
  }
  return (
    <CardGroup
      label="Shared cards"
      cards={cardsInDigitOrder(gameState.round.communityCards)}
      selected={selectedCards}
      source="community"
      onSelectCard={onSelectCard}
      cardsClassName="player-compose-cards--street"
    />
  )
}

function ComposerBuild(props: AnswerComposerProps) {
  const { composed, selectedCards, currentPlayer, onSelectCard, onToggleDecimal, onBackspace, onClear, onSubmit, preload } =
    props
  const ready = selectedCards.length === ANSWER_CARD_COUNT && composed.display.trim().length > 0
  const canUndo = selectedCards.length > 0 || composed.display.length > 0
  const decimalOn = composed.display.includes('.') ? ' player-compose-key--on' : ''
  return (
    <>
      <div className="player-compose-stage">
        <AnswerRail digits={composed.digits} />
        <div className="player-compose-sources">
          <CardGroup
            label="Your cards"
            cards={cardsInDigitOrder(currentPlayer.hand)}
            selected={selectedCards}
            source="hand"
            onSelectCard={onSelectCard}
            trailing={
              <button
                type="button"
                className={`player-compose-key player-compose-decimal${decimalOn}`}
                onClick={onToggleDecimal}
                aria-label="Decimal point"
              >
                .
              </button>
            }
          />
          <SharedCards gameState={props.gameState} selectedCards={selectedCards} onSelectCard={onSelectCard} />
        </div>
      </div>
      <div className="player-compose-tools">
        <button type="button" className="player-compose-key" onClick={onBackspace} disabled={!canUndo} aria-label="Backspace">
          Undo
        </button>
        <PlayerGameButton variant="fold" size="large" onClick={onClear}>
          Clear
        </PlayerGameButton>
        <PlayerGameButton variant="gold" size="large" onClick={onSubmit} disabled={!ready}>
          {preload ? 'Lock in answer' : 'Submit answer'}
        </PlayerGameButton>
      </div>
    </>
  )
}

export default function AnswerComposer(props: AnswerComposerProps) {
  const locked = Boolean(props.submittedDisplay)
  const forfeited = props.currentPlayer.answerForfeited === true
  return (
    <PlayerGoldPanel title={composerTitle(props.currentPlayer.pointsOnly === true, props.preload === true)}>
      <div className="player-compose">
        <ComposerStatus {...props} />
        {forfeited ? null : locked ? (
          <LockedAnswer
            submittedDisplay={props.submittedDisplay ?? ''}
            remainingSec={props.remainingSec}
            onEditSubmitted={props.onEditSubmitted}
          />
        ) : (
          <ComposerBuild {...props} />
        )}
      </div>
    </PlayerGoldPanel>
  )
}
