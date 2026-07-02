import { QuizzEmWordmark } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID, displayBettingPhaseLabel, isWageringPaused } from '@qhe/core'

type PlayerTableHeaderProps = {
  disconnected?: boolean
}

export function PlayerTableHeader({ disconnected }: PlayerTableHeaderProps) {
  return (
    <header className="player-join-header player-game-header">
      <div className="player-join-logo-glow" aria-hidden />
      <div className="player-join-logo">
        <QuizzEmWordmark layout="fill" depth="hero" />
      </div>
      {disconnected ? (
        <p className="player-game-reconnect" role="status">
          Reconnecting…
        </p>
      ) : null}
    </header>
  )
}

type PlayerGameStatusBarProps = {
  gameState: GameState
  playerName: string
  myIndex: number
  answerPoints: number
}

export function PlayerGameStatusBar({
  gameState,
  playerName,
  myIndex,
  answerPoints,
}: PlayerGameStatusBarProps) {
  const showSeat = (gameState.tableId ?? '') !== LOBBY_TABLE_ID && myIndex >= 0
  const wageringRound = gameState.round.bettingRound ?? 0
  const boardHidden =
    gameState.phase === 'betting' && wageringRound === 1 && gameState.round.communityCards.length === 0
  const phaseLabel =
    gameState.phase === 'betting'
      ? displayBettingPhaseLabel(gameState.round)
      : gameState.phase

  return (
    <div>
      <p className="player-game-meta">
        Venue <strong className="player-game-meta-code">{gameState.code}</strong>
        {' · '}
        Table <strong>{gameState.tableId ?? '1'}</strong>
        {showSeat ? (
          <>
            {' · '}
            Seat <strong>{myIndex + 1}</strong>
          </>
        ) : null}
        {' · '}
        Trivia <strong className="player-game-meta-em">{answerPoints}</strong>
        <span className="player-game-meta-name">{playerName}</span>
      </p>

      <div className="player-game-phase" aria-label="Current phase">
        <span className="player-game-phase-label">Phase</span>
        <span className="player-game-phase-value">{phaseLabel}</span>
        {gameState.phase === 'betting' ? (
          <div className="player-game-phase-detail">
            Wager rnd <strong>{wageringRound || '—'}</strong>
            {boardHidden ? <div>Board hidden until flop is dealt.</div> : null}
            {isWageringPaused(gameState.phase, gameState.round) ? (
              <div>Waiting for the host to deal the board or open answering.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
