import { useMemo } from 'react'
import { ChipText, MOSAIC_SEAT_COUNT, NumericPlayingCard, StadiumTableSeats, type StadiumTableSeat } from '@qhe/ui'
import type { GameState, PlayerState, SeatBettingAction } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'
import { PlayerGoldPanel } from './PlayerGoldChrome'
import {
  buildPlayerTableStatusLine,
  resolveSeatStatusPill,
  rosterDisplayName,
  seatStreetContribution,
  seatToCallAmount,
  type SeatStatusPill,
} from '../playerModel/seatBettingStatus'

type TableFeltViewProps = {
  gameState: GameState
  playerName: string
  /** Stable id — preferred over name when marking the You seat. */
  myPlayerId?: string | null
  myIndex?: number
  /** When false, pot is shown elsewhere (e.g. sticky question bar). */
  showCenterPot?: boolean
  /** Felt fills remaining viewport height. */
  fillViewport?: boolean
  turnRemainingSec?: number | null
  playerOnline?: Record<string, boolean>
}

function seatStatusPillClass(pill: SeatStatusPill): string {
  if (pill.kind === 'acting') return 'player-game-seat-pill player-game-seat-pill--acting'
  if (pill.kind === 'allIn') return 'player-game-seat-pill player-game-seat-pill--allIn'
  if (pill.kind === 'away') return 'player-game-seat-pill player-game-seat-pill--away'
  if (pill.kind === 'street') return 'player-game-seat-pill player-game-seat-pill--street'
  return `player-game-seat-pill player-game-seat-pill--${pill.action}`
}

function guessIsLocked(player: PlayerState): boolean {
  return player.answerLocked === true || player.submittedAnswer != null
}

function answeringStatus(
  player: PlayerState,
  phase: GameState['phase'],
): { pill: SeatStatusPill; locked: boolean } | null {
  if (phase !== 'answering') return null
  const locked = guessIsLocked(player)
  if (player.pointsOnly === true) {
    if (locked) {
      return { pill: { kind: 'action', action: 'check', label: 'PTS · LOCKED' }, locked: true }
    }
    return { pill: { kind: 'acting', label: 'PTS · Thinking…' }, locked: false }
  }
  if (player.hasFolded) {
    if (locked) {
      return { pill: { kind: 'action', action: 'fold', label: 'FOLD · LOCKED' }, locked: false }
    }
    return { pill: { kind: 'action', action: 'fold', label: 'FOLD · PTS' }, locked: false }
  }
  if (locked) {
    return { pill: { kind: 'action', action: 'check', label: 'LOCKED' }, locked: true }
  }
  return { pill: { kind: 'acting', label: 'Thinking…' }, locked: false }
}

function StatusPillView({ pill, locked }: { pill: SeatStatusPill; locked?: boolean }) {
  return (
    <span
      className={
        locked ? 'player-game-seat-pill player-game-seat-pill--locked' : seatStatusPillClass(pill)
      }
    >
      {pill.label.includes('$') ? <ChipText text={pill.label} /> : pill.label}
    </span>
  )
}

/** Seated view — the felt, with each player at a chair. */
export default function TableFeltView({
  gameState,
  playerName,
  myPlayerId = null,
  myIndex: myIndexProp,
  showCenterPot = true,
  fillViewport = false,
  turnRemainingSec = null,
  playerOnline,
}: TableFeltViewProps) {
  const players = gameState.players

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

  const showSeat = (gameState.tableId ?? '') !== LOBBY_TABLE_ID
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
  const hero = heroIndex >= 0 ? players[heroIndex] : undefined
  const heroHoles =
    hero && hero.hand.length >= 2
      ? ([hero.hand[0]!.digit, hero.hand[1]!.digit] as const)
      : null
  const heroFolded = hero?.hasFolded === true && hero?.pointsOnly !== true

  const communityDigits = useMemo(
    () =>
      gameState.round.communityCards.length > 0
        ? gameState.round.communityCards.map((c) => c.digit)
        : undefined,
    [gameState.round.communityCards],
  )

  const statusLine = useMemo(
    () => buildPlayerTableStatusLine(gameState, playerName, turnRemainingSec),
    [gameState, playerName, turnRemainingSec],
  )

  const seats = useMemo((): StadiumTableSeat[] => {
    return players.map((player, index) => {
      const isMe = index === heroIndex
      const isActing = actingIndex === index && !player.hasFolded
      const isAway = playerOnline?.[player.id] === false
      const knownDigits: readonly [number, number] | null =
        player.hand.length >= 2
          ? ([player.hand[0]!.digit, player.hand[1]!.digit] as const)
          : null
      const pointsOnly = player.pointsOnly === true
      const foldedChips = player.hasFolded && !pointsOnly
      const showFaceUp = (isMe || revealCards) && knownDigits != null
      const holeDigits: readonly [number, number] | null =
        knownDigits != null && !foldedChips ? knownDigits : null
      const holeBacks = holeDigits == null && !foldedChips && player.holesDealt === true

      const lastAction: SeatBettingAction | null | undefined = lastActions?.[index]
      const toCall = seatToCallAmount(player, currentBet, playerBets)
      const streetIn = seatStreetContribution(player, playerBets)
      const bettingPill = resolveSeatStatusPill({
        player,
        isActing,
        lastAction,
        toCall,
        streetIn,
        isAway,
      })
      const quizStatus = answeringStatus(player, gameState.phase)
      const statusPill = quizStatus?.pill ?? bettingPill
      const statusLocked = quizStatus?.locked === true

      const tagText = 'text-sm leading-tight sm:text-base'

      return {
        index,
        label: showSeat ? index + 1 : isMe ? 'You' : rosterDisplayName(player.name).slice(0, 2),
        labelClassName: 'font-mono text-sm tabular-nums sm:text-base font-bold',
        state: foldedChips
          ? 'folded'
          : statusLocked
            ? 'answerLocked'
            : isActing
              ? 'acting'
              : 'default',
        holeDigits,
        holeBacks,
        faceDown: !showFaceUp,
        holeVariant: isMe ? 'gold' : 'purple',
        'aria-label': [
          player.name,
          isMe ? 'you' : null,
          `seat ${index + 1}`,
          pointsOnly ? 'points only' : null,
          foldedChips ? 'folded' : null,
          isAway ? 'away' : null,
          isActing ? 'has the wagering turn' : null,
          statusPill?.label ?? null,
        ]
          .filter(Boolean)
          .join(', '),
        nameTag: (
          <>
            <span className={`max-w-full truncate font-bold ${isMe ? 'text-amber-300' : 'text-emerald-200'} ${tagText}`}>
              {rosterDisplayName(player.name)}
              {isMe ? <span className="player-hud-you-badge">You</span> : null}
            </span>
            <span className={`font-bold tabular-nums text-amber-300 ${tagText}`}>
              {pointsOnly ? (
                `${(player.answerPoints ?? 0).toLocaleString()} pts`
              ) : (
                <ChipText text={`$${player.bankroll.toLocaleString()}`} />
              )}
            </span>
            {statusPill ? <StatusPillView pill={statusPill} locked={statusLocked} /> : null}
          </>
        ),
      }
    })
  }, [
    players,
    heroIndex,
    actingIndex,
    revealCards,
    showSeat,
    lastActions,
    playerBets,
    currentBet,
    playerOnline,
    gameState.phase,
  ])

  if (players.length === 0) return null

  return (
    <PlayerGoldPanel
      className={
        fillViewport ? 'player-game-felt-panel player-game-felt-panel--fill' : 'player-game-felt-panel'
      }
    >
      {statusLine ? (
        <p className="player-game-table-status" aria-live="polite" role="status">
          <ChipText text={statusLine} />
        </p>
      ) : null}
      <StadiumTableSeats
        feltLayout="player"
        seatCount={MOSAIC_SEAT_COUNT}
        hideEmptySeats
        seats={seats}
        communityDigits={communityDigits}
        aspectClassName={
          fillViewport
            ? 'player-game-felt player-game-felt--fill aspect-[8/5] w-full'
            : 'player-game-felt aspect-[8/5] w-full'
        }
        centerContent={
          showCenterPot && pot > 0 ? (
            <span className="player-game-table-pot">
              <ChipText text={`Pot $${pot.toLocaleString()}`} />
            </span>
          ) : null
        }
      />
      {heroHoles && heroFolded ? (
        <div className="player-hud-hero-cards player-hud-hero-cards--folded" aria-label="Your cards (folded chips)">
          <span className="player-hud-hero-cards-label">Your cards · folded</span>
          <div className="player-hud-hero-cards-pair">
            <NumericPlayingCard digit={heroHoles[0]} size="normal" compact animated={false} />
            <NumericPlayingCard digit={heroHoles[1]} size="normal" compact animated={false} />
          </div>
        </div>
      ) : null}
    </PlayerGoldPanel>
  )
}
