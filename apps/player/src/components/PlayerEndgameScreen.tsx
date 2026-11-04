import { PLAYER_ROOM_CLOSED_MESSAGE } from '@qhe/net'
import { ChipText, QuizzEmWordmark } from '@qhe/ui'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule, PlayerGoldPanel } from './PlayerGoldChrome'

export default function PlayerEndgameScreen({
  winnerName,
  selfWon,
  bankroll,
}: {
  winnerName: string
  selfWon: boolean
  bankroll: number | null
}) {
  const stack = bankroll != null ? `$${bankroll.toLocaleString()}` : null
  return (
    <PlayerGameScreen>
      <div className="player-game-layout player-join-layout">
        <PlayerGameShell>
          <header className="player-join-header player-game-header">
            <div className="player-join-logo-glow" aria-hidden />
            <div className="player-join-logo">
              <QuizzEmWordmark layout="fill" depth="hero" />
            </div>
          </header>
          <PlayerGoldHeaderRule />
          <div className="player-game-eliminated-body">
            <PlayerGoldPanel>
              <p className="player-game-eliminated-title">{selfWon ? 'You won' : 'Game over'}</p>
              <p className="player-game-connecting-text">
                {selfWon ? (
                  <>
                    {winnerName}
                    {stack != null ? (
                      <>
                        {' · '}
                        <ChipText text={stack} />
                      </>
                    ) : null}
                  </>
                ) : (
                  `${winnerName} has the last stack.`
                )}
              </p>
              <p className="player-game-connecting-text">{PLAYER_ROOM_CLOSED_MESSAGE}</p>
            </PlayerGoldPanel>
          </div>
        </PlayerGameShell>
      </div>
    </PlayerGameScreen>
  )
}
