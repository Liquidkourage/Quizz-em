import { useMemo } from 'react'
import { NumericPlayingCard, PlayerFeltHoleCards } from '@qhe/ui'
import type { GameState, PlayerState, SeatBettingAction } from '@qhe/core'
import {
  buildPlayerTableStatusLine,
  firstName,
  resolveSeatStatusPill,
  seatStreetContribution,
  seatToCallAmount,
  type SeatStatusPill,
} from '../playerModel/seatBettingStatus'

type TableStatusHudProps = {
  gameState: GameState
  playerName: string
  /** When false, pot is shown elsewhere (e.g. sticky question bar). */
  showCenterPot?: boolean
  fillViewport?: boolean
}

function seatStatusPillClass(pill: SeatStatusPill): string {
  if (pill.kind === 'acting') return 'player-game-seat-pill player-game-seat-pill--acting'
  if (pill.kind === 'allIn') return 'player-game-seat-pill player-game-seat-pill--allIn'
  return `player-game-seat-pill player-game-seat-pill--${pill.action}`
}

function answeringStatus(
  player: PlayerState,
  phase: GameState['phase'],
): { pill: SeatStatusPill; locked: boolean } | null {
  if (phase !== 'answering' || player.hasFolded) return null
  if (player.submittedAnswer != null) {
    return {
      pill: { kind: 'action', action: 'check', label: 'LOCKED' },
      locked: true,
    }
  }
  return { pill: { kind: 'acting', label: 'Thinking…' }, locked: false }
}

function StatusPillView({
  pill,
  locked,
}: {
  pill: SeatStatusPill
  locked?: boolean
}) {
  return (
    <span
      className={
        locked
          ? 'player-game-seat-pill player-game-seat-pill--locked'
          : seatStatusPillClass(pill)
      }
    >
      {pill.label}
    </span>
  )
}

type SeatRowProps = {
  player: PlayerState
  seatIndex: number
  isYou: boolean
  isActing: boolean
  lastAction: SeatBettingAction | null | undefined
  toCall: number
  streetIn: number
  revealCards: boolean
  phase: GameState['phase']
}

function SeatRow({
  player,
  seatIndex,
  isYou,
  isActing,
  lastAction,
  toCall,
  streetIn,
  revealCards,
  phase,
}: SeatRowProps) {
  const hasHand = player.hand.length >= 2
  const showFaceUp = (isYou || revealCards) && hasHand && !player.hasFolded
  const holeDigits: readonly [number, number] | null =
    hasHand && !player.hasFolded ? [player.hand[0]!.digit, player.hand[1]!.digit] : null

  const bettingPill = resolveSeatStatusPill({ player, isActing, lastAction, toCall })
  const quizStatus = answeringStatus(player, phase)
  const statusPill = quizStatus?.pill ?? bettingPill
  const statusLocked = quizStatus?.locked === true

  const rowClass = [
    'player-hud-seat',
    'player-hud-seat--roster',
    isYou ? 'player-hud-seat--you' : '',
    isActing ? 'player-hud-seat--acting' : '',
    player.hasFolded ? 'player-hud-seat--folded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={rowClass}
      aria-label={[
        player.name,
        isYou ? 'you' : null,
        `seat ${seatIndex + 1}`,
        player.hasFolded ? 'folded' : null,
        isActing ? 'has the wagering turn' : null,
        statusPill?.label ?? null,
      ]
        .filter(Boolean)
        .join(', ')}
      data-seat={seatIndex + 1}
    >
      <span className="player-hud-seat-pos" aria-hidden>
        {seatIndex + 1}
      </span>
      <span className="player-hud-seat-name">
        {firstName(player.name)}
        {isYou ? <span className="player-hud-you-badge">You</span> : null}
      </span>
      <span className="player-hud-seat-stack">${player.bankroll.toLocaleString()}</span>
      {streetIn > 0 && !player.hasFolded && !isActing ? (
        <span className="player-game-seat-street-in">${streetIn.toLocaleString()} in</span>
      ) : (
        <span className="player-hud-seat-spacer" aria-hidden />
      )}
      {statusPill ? (
        <StatusPillView pill={statusPill} locked={statusLocked} />
      ) : (
        <span className="player-hud-seat-spacer" aria-hidden />
      )}
      {revealCards && hasHand && !player.hasFolded && !isYou ? (
        <div className="player-hud-seat-holes player-hud-seat-holes--mini">
          <PlayerFeltHoleCards scale={0.28} faceDown={!showFaceUp} digits={holeDigits} />
        </div>
      ) : null}
    </article>
  )
}

export default function TableStatusHud({
  gameState,
  playerName,
  showCenterPot = true,
  fillViewport = false,
}: TableStatusHudProps) {
  const players = gameState.players
  if (players.length === 0) return null

  const heroIndex = players.findIndex((p) => p.name === playerName)
  const revealCards = gameState.phase === 'showdown' || gameState.phase === 'reveal'
  const actingIndex =
    gameState.phase === 'betting' &&
    gameState.round.isBettingOpen &&
    typeof gameState.round.currentPlayerIndex === 'number' &&
    gameState.round.currentPlayerIndex >= 0
      ? gameState.round.currentPlayerIndex
      : null

  const lastActions = gameState.round.lastSeatBettingAction
  const playerBets = gameState.round.playerBets
  const currentBet = gameState.round.currentBet
  const pot = gameState.round.pot
  const community = gameState.round.communityCards
  const hero = heroIndex >= 0 ? players[heroIndex] : undefined
  const heroHoles =
    hero && hero.hand.length >= 2 && !hero.hasFolded
      ? ([hero.hand[0]!.digit, hero.hand[1]!.digit] as const)
      : null

  const statusLine = useMemo(
    () => buildPlayerTableStatusLine(gameState, playerName),
    [gameState, playerName],
  )

  const shellClass = [
    'player-table-hud',
    fillViewport ? 'player-table-hud--fill' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={`${shellClass}${fillViewport ? ' player-game-felt-panel player-game-felt-panel--fill' : ' player-game-panel player-game-felt-panel'}`}
      aria-label="Your table"
    >
      {statusLine ? (
        <p className="player-game-table-status" aria-live="polite" role="status">
          {statusLine}
        </p>
      ) : null}

      <div className="player-hud-roster" role="list" aria-label="Table seats">
        {players.map((player, index) => (
          <div key={player.id} className="player-hud-opp-item" role="listitem">
            <SeatRow
              player={player}
              seatIndex={index}
              isYou={index === heroIndex}
              isActing={actingIndex === index && !player.hasFolded}
              lastAction={lastActions?.[index]}
              toCall={seatToCallAmount(player, currentBet, playerBets)}
              streetIn={seatStreetContribution(player, playerBets)}
              revealCards={revealCards}
              phase={gameState.phase}
            />
          </div>
        ))}
      </div>

      <div className="player-hud-center">
        {showCenterPot && pot > 0 ? (
          <span className="player-game-table-pot">Pot ${pot.toLocaleString()}</span>
        ) : pot > 0 ? (
          <span className="player-hud-center-pot-quiet">Pot ${pot.toLocaleString()}</span>
        ) : (
          <span className="player-hud-center-pot-quiet">Pot —</span>
        )}
        {community.length > 0 ? (
          <div className="player-hud-board" aria-label="Community cards">
            {community.slice(0, 5).map((card, i) => (
              <NumericPlayingCard
                key={`${card.digit}-${i}`}
                digit={card.digit}
                size="small"
                compact
                animated={false}
              />
            ))}
          </div>
        ) : (
          <p className="player-hud-board-empty">Board deals after this street</p>
        )}
      </div>

      {heroHoles ? (
        <div className="player-hud-hero-holes" aria-label="Your hole cards">
          <span className="player-hud-hero-holes-label">Your holes</span>
          <PlayerFeltHoleCards scale={0.72} faceDown={false} digits={heroHoles} />
        </div>
      ) : null}
    </section>
  )
}
