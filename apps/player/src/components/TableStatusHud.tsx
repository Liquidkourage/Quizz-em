import { useMemo } from 'react'
import { NumericPlayingCard, PlayerFeltHoleCards } from '@qhe/ui'
import type { GameState, PlayerState, SeatBettingAction } from '@qhe/core'
import {
  buildPlayerTableStatusLine,
  firstName,
  heroRelativeSeatOrder,
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

type SeatChipProps = {
  player: PlayerState
  seatIndex: number
  isHero: boolean
  isActing: boolean
  lastAction: SeatBettingAction | null | undefined
  toCall: number
  streetIn: number
  revealCards: boolean
  phase: GameState['phase']
}

function SeatChip({
  player,
  seatIndex,
  isHero,
  isActing,
  lastAction,
  toCall,
  streetIn,
  revealCards,
  phase,
}: SeatChipProps) {
  const hasHand = player.hand.length >= 2
  const showFaceUp = (isHero || revealCards) && hasHand && !player.hasFolded
  const holeDigits: readonly [number, number] | null =
    hasHand && !player.hasFolded ? [player.hand[0]!.digit, player.hand[1]!.digit] : null

  const bettingPill = resolveSeatStatusPill({ player, isActing, lastAction, toCall })
  const quizStatus = answeringStatus(player, phase)
  const statusPill = quizStatus?.pill ?? bettingPill
  const statusLocked = quizStatus?.locked === true

  const label = isHero ? 'You' : firstName(player.name)
  const chipClass = [
    'player-hud-seat',
    isHero ? 'player-hud-seat--hero' : 'player-hud-seat--opp',
    isActing ? 'player-hud-seat--acting' : '',
    player.hasFolded ? 'player-hud-seat--folded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={chipClass}
      aria-label={[
        player.name,
        isHero ? 'you' : null,
        player.hasFolded ? 'folded' : null,
        isActing ? 'has the wagering turn' : null,
        statusPill?.label ?? null,
      ]
        .filter(Boolean)
        .join(', ')}
      data-seat={seatIndex + 1}
    >
      <div className="player-hud-seat-meta">
        <span className="player-hud-seat-name">{label}</span>
        <span className="player-hud-seat-stack">${player.bankroll.toLocaleString()}</span>
        {streetIn > 0 && !player.hasFolded && !isActing ? (
          <span className="player-game-seat-street-in">${streetIn.toLocaleString()} in</span>
        ) : null}
        {statusPill ? (
          <span
            className={
              statusLocked
                ? 'player-game-seat-pill player-game-seat-pill--locked'
                : seatStatusPillClass(statusPill)
            }
          >
            {statusPill.label}
          </span>
        ) : null}
      </div>
      {hasHand && !player.hasFolded ? (
        <div className="player-hud-seat-holes" aria-hidden={!showFaceUp}>
          <PlayerFeltHoleCards
            scale={isHero ? 0.72 : 0.42}
            faceDown={!showFaceUp}
            digits={holeDigits}
          />
        </div>
      ) : (
        <div className="player-hud-seat-holes player-hud-seat-holes--empty" aria-hidden />
      )}
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

  const heroIndex = Math.max(
    0,
    players.findIndex((p) => p.name === playerName),
  )
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

  const statusLine = useMemo(
    () => buildPlayerTableStatusLine(gameState, playerName),
    [gameState, playerName],
  )

  const { opponentIndices } = useMemo(
    () => heroRelativeSeatOrder(players.length, heroIndex),
    [players.length, heroIndex],
  )

  const shellClass = [
    'player-table-hud',
    fillViewport ? 'player-table-hud--fill' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderSeat = (index: number, isHero: boolean) => {
    const player = players[index]
    if (!player) return null
    return (
      <SeatChip
        key={player.id}
        player={player}
        seatIndex={index}
        isHero={isHero}
        isActing={actingIndex === index && !player.hasFolded}
        lastAction={lastActions?.[index]}
        toCall={seatToCallAmount(player, currentBet, playerBets)}
        streetIn={seatStreetContribution(player, playerBets)}
        revealCards={revealCards}
        phase={gameState.phase}
      />
    )
  }

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

      <div className="player-hud-opponents" role="list" aria-label="Table mates">
        {opponentIndices.map((index) => (
          <div key={players[index]?.id ?? index} role="listitem">
            {renderSeat(index, false)}
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

      <div className="player-hud-hero">{renderSeat(heroIndex, true)}</div>
    </section>
  )
}
