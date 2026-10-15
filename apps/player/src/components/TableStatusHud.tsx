import { useMemo } from 'react'
import { NumericPlayingCard, PlayerFeltHoleCards, ChipText } from '@qhe/ui'
import type { GameState, PlayerState, SeatBettingAction } from '@qhe/core'
import {
  buildPlayerTableStatusLine,
  rosterDisplayName,
  resolveSeatStatusPill,
  seatStreetContribution,
  seatToCallAmount,
  type SeatStatusPill,
} from '../playerModel/seatBettingStatus'

type TableStatusHudProps = {
  gameState: GameState
  playerName: string
  /** Stable id — preferred when marking the You row (duplicate first names). */
  myPlayerId?: string | null
  myIndex?: number
  /** When false, pot is shown elsewhere (e.g. sticky question bar). */
  showCenterPot?: boolean
  fillViewport?: boolean
  /** Seconds left on the acting human’s shot clock. */
  turnRemainingSec?: number | null
  /** Wire map of playerId → online. */
  playerOnline?: Record<string, boolean>
}

function seatStatusPillClass(pill: SeatStatusPill): string {
  if (pill.kind === 'acting') return 'player-game-seat-pill player-game-seat-pill--acting'
  if (pill.kind === 'allIn') return 'player-game-seat-pill player-game-seat-pill--allIn'
  if (pill.kind === 'away') return 'player-game-seat-pill player-game-seat-pill--away'
  if (pill.kind === 'street') return 'player-game-seat-pill player-game-seat-pill--street'
  return `player-game-seat-pill player-game-seat-pill--${pill.action}`
}

function answeringStatus(
  player: PlayerState,
  phase: GameState['phase'],
): { pill: SeatStatusPill; locked: boolean } | null {
  if (phase !== 'answering') return null
  // Keep fold color language while composing for trivia pts.
  if (player.hasFolded) {
    if (player.submittedAnswer != null) {
      return {
        pill: { kind: 'action', action: 'fold', label: 'FOLD · LOCKED' },
        locked: false,
      }
    }
    return {
      pill: { kind: 'action', action: 'fold', label: 'FOLD · PTS' },
      locked: false,
    }
  }
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
      {pill.label.includes('$') ? <ChipText text={pill.label} /> : pill.label}
    </span>
  )
}

type SeatRowProps = {
  player: PlayerState
  seatIndex: number
  isYou: boolean
  isActing: boolean
  isAway: boolean
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
  isAway,
  lastAction,
  toCall,
  streetIn,
  revealCards,
  phase,
}: SeatRowProps) {
  const hasHand = player.hand.length >= 2
  // You always see your holes (even after fold — still needed for trivia).
  // Opponents' holes only face-up at reveal/showdown.
  const showFaceUp = (isYou || revealCards) && hasHand
  const holeDigits: readonly [number, number] | null = hasHand
    ? ([player.hand[0]!.digit, player.hand[1]!.digit] as const)
    : null

  const bettingPill = resolveSeatStatusPill({
    player,
    isActing,
    lastAction,
    toCall,
    streetIn,
    isAway,
  })
  // During answering, quiz status wins — including folded seats still composing for pts.
  const quizStatus = answeringStatus(player, phase)
  const statusPill = quizStatus?.pill ?? bettingPill
  const statusLocked = quizStatus?.locked === true

  const rowClass = [
    'player-hud-seat',
    'player-hud-seat--roster',
    isYou ? 'player-hud-seat--you' : '',
    isActing ? 'player-hud-seat--acting' : '',
    player.hasFolded ? 'player-hud-seat--folded' : '',
    isAway && !player.hasFolded ? 'player-hud-seat--away' : '',
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
        isAway ? 'away' : null,
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
        <span className="player-hud-seat-name-text">{rosterDisplayName(player.name)}</span>
        {isYou ? <span className="player-hud-you-badge">You</span> : null}
        {player.hasFolded ? (
          <span className="player-hud-folded-tag" aria-hidden>
            Folded
          </span>
        ) : null}
      </span>
      <span className="player-hud-seat-stack">
        <ChipText text={`$${player.bankroll.toLocaleString()}`} />
      </span>
      {statusPill ? (
        <StatusPillView pill={statusPill} locked={statusLocked} />
      ) : (
        <span className="player-hud-seat-spacer" aria-hidden />
      )}
      {revealCards && hasHand && !isYou ? (
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
  myPlayerId = null,
  myIndex: myIndexProp,
  showCenterPot = true,
  fillViewport = false,
  turnRemainingSec = null,
  playerOnline,
}: TableStatusHudProps) {
  const players = gameState.players
  if (players.length === 0) return null

  const heroIndex = (() => {
    if (typeof myIndexProp === 'number' && myIndexProp >= 0 && myIndexProp < players.length) {
      return myIndexProp
    }
    if (myPlayerId) {
      const byId = players.findIndex((p) => p.id === myPlayerId)
      if (byId >= 0) return byId
    }
    return players.findIndex((p) => p.name === playerName)
  })()
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
    hero && hero.hand.length >= 2
      ? ([hero.hand[0]!.digit, hero.hand[1]!.digit] as const)
      : null
  const heroFolded = hero?.hasFolded === true

  const statusLine = useMemo(
    () => buildPlayerTableStatusLine(gameState, playerName, turnRemainingSec),
    [gameState, playerName, turnRemainingSec],
  )

  const shellClass = [
    'player-table-hud',
    fillViewport ? 'player-table-hud--fill' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showBoard = community.length > 0
  const showPotBlock = showCenterPot && pot > 0

  return (
    <section
      className={`${shellClass}${fillViewport ? ' player-game-felt-panel player-game-felt-panel--fill' : ' player-game-panel player-game-felt-panel'}`}
      aria-label="Your table"
    >
      {statusLine ? (
        <p className="player-game-table-status" aria-live="polite" role="status">
          <ChipText text={statusLine} />
        </p>
      ) : null}

      <div className="player-hud-roster" role="list" aria-label="Table seats">
        {players.map((player, index) => {
          const online = playerOnline?.[player.id]
          const isAway = online === false
          return (
            <div key={player.id} className="player-hud-opp-item" role="listitem">
              <SeatRow
                player={player}
                seatIndex={index}
                isYou={index === heroIndex}
                isActing={actingIndex === index && !player.hasFolded}
                isAway={isAway}
                lastAction={lastActions?.[index]}
                toCall={seatToCallAmount(player, currentBet, playerBets)}
                streetIn={seatStreetContribution(player, playerBets)}
                revealCards={revealCards}
                phase={gameState.phase}
              />
            </div>
          )
        })}
      </div>

      {showPotBlock || showBoard ? (
        <div className="player-hud-center">
          {showPotBlock ? (
            <span className="player-game-table-pot">
              <ChipText text={`Pot $${pot.toLocaleString()}`} />
            </span>
          ) : null}
          {showBoard ? (
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
          ) : null}
        </div>
      ) : null}

      {heroHoles ? (
        <div
          className={`player-hud-hero-cards${heroFolded ? ' player-hud-hero-cards--folded' : ''}`}
          aria-label={heroFolded ? 'Your cards (folded chips)' : 'Your cards'}
        >
          <span className="player-hud-hero-cards-label">
            Your cards{heroFolded ? ' · folded' : ''}
          </span>
          <div className="player-hud-hero-cards-pair">
            <NumericPlayingCard
              digit={heroHoles[0]}
              size="normal"
              compact
              animated={false}
            />
            <NumericPlayingCard
              digit={heroHoles[1]}
              size="normal"
              compact
              animated={false}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
