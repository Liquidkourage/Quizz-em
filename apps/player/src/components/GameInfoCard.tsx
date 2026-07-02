import type { GameState } from '@qhe/core'
import { formatTriviaNumber } from '@qhe/core'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type GameInfoCardProps = {
  gameState: GameState
}

export default function GameInfoCard({ gameState }: GameInfoCardProps) {
  const q = gameState.round.question

  return (
    <PlayerGoldPanel>
      <p className="player-game-pot-label">Pot</p>
      <p className="player-game-pot-value">${gameState.round.pot}</p>
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
