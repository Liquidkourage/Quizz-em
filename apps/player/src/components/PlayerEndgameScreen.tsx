import { PLAYER_ROOM_CLOSED_MESSAGE } from '@qhe/net'
import { ChipText, QuizzEmWordmark } from '@qhe/ui'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule, PlayerGoldPanel } from './PlayerGoldChrome'

function awardLine(label: string, names: readonly string[]): string | null {
  if (names.length === 0) return null
  return `${label}: ${names.join(', ')}`
}

export default function PlayerEndgameScreen({
  winnerName,
  chipNames,
  pointsNames,
  selfWonChips,
  selfWonPoints,
  bankroll,
}: {
  winnerName: string
  chipNames?: readonly string[]
  pointsNames?: readonly string[]
  selfWonChips?: boolean
  selfWonPoints?: boolean
  bankroll: number | null
}) {
  const chips = chipNames ?? [winnerName]
  const points = pointsNames ?? []
  const stack = bankroll != null ? `$${bankroll.toLocaleString()}` : null
  const title = selfWonChips ? 'You won the chips' : selfWonPoints ? 'You won the points' : 'Game over'
  const chipLine = awardLine('Chips', chips)
  const pointsLine = awardLine('Points', points)
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
              <p className="player-game-eliminated-title">{title}</p>
              {chipLine ? (
                <p className="player-game-connecting-text">
                  {chipLine}
                  {selfWonChips && stack != null ? (
                    <>
                      {' · '}
                      <ChipText text={stack} />
                    </>
                  ) : null}
                </p>
              ) : null}
              {pointsLine ? <p className="player-game-connecting-text">{pointsLine}</p> : null}
              <p className="player-game-connecting-text">{PLAYER_ROOM_CLOSED_MESSAGE}</p>
            </PlayerGoldPanel>
          </div>
        </PlayerGameShell>
      </div>
    </PlayerGameScreen>
  )
}
