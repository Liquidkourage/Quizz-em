import { useMemo } from 'react'
import { MOSAIC_SEAT_COUNT, StadiumTableSeats, type StadiumTableSeat } from '@qhe/ui'
import type { GameState, SeatBettingAction } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'
import { PlayerGoldPanel } from './PlayerGoldChrome'
import {
  buildPlayerTableStatusLine,
  firstName,
  resolveSeatStatusPill,
  seatStreetContribution,
  seatToCallAmount,
  type SeatStatusPill,
} from '../playerModel/seatBettingStatus'

type TableFeltViewProps = {
  gameState: GameState
  playerName: string
  /** When false, pot is shown elsewhere (e.g. sticky question bar). */
  showCenterPot?: boolean
  /** Drop panel title; felt fills remaining viewport height. */
  fillViewport?: boolean
}

function seatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function seatStatusPillClass(pill: SeatStatusPill): string {
  if (pill.kind === 'acting') {
    return 'player-game-seat-pill player-game-seat-pill--acting'
  }
  if (pill.kind === 'allIn') {
    return 'player-game-seat-pill player-game-seat-pill--allIn'
  }
  return `player-game-seat-pill player-game-seat-pill--${pill.action}`
}

function SeatStatusPillView({ pill }: { pill: SeatStatusPill }) {
  return <span className={seatStatusPillClass(pill)}>{pill.label}</span>
}

export default function TableFeltView({
  gameState,
  playerName,
  showCenterPot = true,
  fillViewport = false,
}: TableFeltViewProps) {
  const players = gameState.players
  if (players.length === 0) return null

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

  const communityDigits = useMemo(
    () =>
      gameState.round.communityCards.length > 0
        ? gameState.round.communityCards.map((c) => c.digit)
        : undefined,
    [gameState.round.communityCards],
  )

  const statusLine = useMemo(
    () => buildPlayerTableStatusLine(gameState, playerName),
    [gameState, playerName],
  )

  const seats = useMemo((): StadiumTableSeat[] => {
    return players.map((player, index) => {
      const isMe = player.name === playerName
      const isActing = actingIndex === index && !player.hasFolded
      const hasHand = player.hand.length >= 2
      const showFaceUp = isMe || revealCards
      const holeDigits: readonly [number, number] | null =
        hasHand && !player.hasFolded ? [player.hand[0]!.digit, player.hand[1]!.digit] : null

      const lastAction: SeatBettingAction | null | undefined = lastActions?.[index]
      const toCall = seatToCallAmount(player, currentBet, playerBets)
      const streetIn = seatStreetContribution(player, playerBets)
      const statusPill = resolveSeatStatusPill({
        player,
        isActing,
        lastAction,
        toCall,
      })

      // Seat identity is primary chrome on phone — keep larger than the rail art.
      const tagText = 'text-base leading-tight sm:text-lg md:text-xl'

      return {
        index,
        label: showSeat ? index + 1 : isMe ? 'You' : seatInitials(player.name),
        labelClassName: 'font-mono text-sm tabular-nums sm:text-base md:text-lg font-bold',
        state: player.hasFolded ? 'folded' : isActing ? 'acting' : 'default',
        holeDigits,
        faceDown: !showFaceUp,
        holeVariant: isMe ? 'gold' : 'purple',
        'aria-label': [
          player.name,
          isMe ? 'you' : null,
          player.hasFolded ? 'folded' : null,
          player.isAllIn ? 'all-in' : null,
          isActing ? 'has the wagering turn' : null,
          statusPill ? statusPill.label : null,
        ]
          .filter(Boolean)
          .join(', '),
        nameTag: (
          <>
            <span
              className={`max-w-full truncate font-bold ${isMe ? 'text-amber-300' : 'text-emerald-200'} ${tagText}`}
            >
              {isMe ? 'You' : firstName(player.name)}
            </span>
            <span className={`font-bold tabular-nums text-amber-300 ${tagText}`}>
              ${player.bankroll.toLocaleString()}
            </span>
            {streetIn > 0 && !player.hasFolded && !isActing ? (
              <span className="player-game-seat-street-in">${streetIn.toLocaleString()} in</span>
            ) : null}
            {statusPill ? <SeatStatusPillView pill={statusPill} /> : null}
          </>
        ),
      }
    })
  }, [
    players,
    playerName,
    actingIndex,
    revealCards,
    showSeat,
    lastActions,
    playerBets,
    currentBet,
  ])

  const pot = gameState.round.pot

  return (
    <PlayerGoldPanel
      title={fillViewport ? undefined : 'Table'}
      className={
        fillViewport
          ? 'player-game-felt-panel player-game-felt-panel--fill'
          : 'player-game-felt-panel'
      }
    >
      {statusLine ? (
        <p className="player-game-table-status" aria-live="polite" role="status">
          {statusLine}
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
            <span className="player-game-table-pot">Pot ${pot.toLocaleString()}</span>
          ) : null
        }
      />
    </PlayerGoldPanel>
  )
}
