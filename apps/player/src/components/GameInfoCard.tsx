import type { GameState, PlayerState } from '@qhe/core'
import { formatTriviaNumber } from '@qhe/core'
import { NumericPlayingCard } from '@qhe/ui'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type GameInfoCardProps = {
  gameState: GameState
  currentPlayer?: PlayerState
}

export default function GameInfoCard({ gameState, currentPlayer }: GameInfoCardProps) {
  const q = gameState.round.question
  const hole = currentPlayer?.hand ?? []
  const board = gameState.round.communityCards
  const showHole = hole.length >= 2
  const showBoard = board.length > 0
  const showCards = showHole || showBoard

  return (
    <PlayerGoldPanel>
      <div className="player-game-info-stats">
        <div className="player-game-info-stat">
          <p className="player-game-pot-label">Pot</p>
          <p className="player-game-pot-value">${gameState.round.pot.toLocaleString()}</p>
        </div>
        {currentPlayer ? (
          <div className="player-game-info-stat">
            <p className="player-game-pot-label">Your stack</p>
            <p className="player-game-pot-value player-game-pot-value--stack">
              ${currentPlayer.bankroll.toLocaleString()}
            </p>
          </div>
        ) : null}
      </div>

      {showCards ? (
        <div className="player-game-info-cards" aria-label="Your cards and community board">
          {showHole ? (
            <div className="player-game-info-card-group">
              <p className="player-game-card-section-label">Your holes</p>
              <div className="player-game-info-card-row">
                {hole.slice(0, 2).map((card, i) => (
                  <span key={`hole-${i}-${card.digit}`} className="player-game-info-card-slot">
                    <NumericPlayingCard
                      digit={card.digit}
                      variant="gold"
                      size="small"
                      compact
                      animated={false}
                    />
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {showBoard ? (
            <div className="player-game-info-card-group">
              <p className="player-game-card-section-label">Board</p>
              <div className="player-game-info-card-row">
                {board.map((card, i) => (
                  <span key={`board-${i}-${card.digit}`} className="player-game-info-card-slot">
                    <NumericPlayingCard
                      digit={card.digit}
                      variant="gold"
                      size="small"
                      compact
                      animated={false}
                    />
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {q ? (
        <div className="player-game-question">
          <p className="player-game-question-label">Question</p>
          <p className="player-game-question-text">{q.text}</p>
          {(gameState.phase === 'showdown' || gameState.phase === 'reveal') && (
            <p className="player-game-question-answer">Answer: {formatTriviaNumber(q.answer)}</p>
          )}
        </div>
      ) : null}
    </PlayerGoldPanel>
  )
}
