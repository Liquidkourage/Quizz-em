import { useMemo } from 'react'
import { StadiumTableSeats, type StadiumTableSeat } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type TableFeltViewProps = {
  gameState: GameState
  playerName: string
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

function firstName(name: string): string {
  const trimmed = name.trim()
  const space = trimmed.indexOf(' ')
  return space > 0 ? trimmed.slice(0, space) : trimmed
}

export default function TableFeltView({ gameState, playerName }: TableFeltViewProps) {
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

  const communityDigits = useMemo(
    () =>
      gameState.round.communityCards.length > 0
        ? gameState.round.communityCards.map((c) => c.digit)
        : undefined,
    [gameState.round.communityCards],
  )

  const seats = useMemo((): StadiumTableSeat[] => {
    return players.map((player, index) => {
      const isMe = player.name === playerName
      const isActing = actingIndex === index && !player.hasFolded
      const hasHand = player.hand.length >= 2
      const showFaceUp = isMe || revealCards
      const holeDigits: readonly [number, number] | null =
        hasHand && !player.hasFolded ? [player.hand[0]!.digit, player.hand[1]!.digit] : null

      const tagText = 'text-sm sm:text-base leading-tight'

      return {
        index,
        label: showSeat ? index + 1 : seatInitials(player.name),
        labelClassName: 'font-mono text-xs tabular-nums sm:text-sm font-bold',
        state: player.hasFolded ? 'folded' : isActing ? 'acting' : 'default',
        holeDigits,
        faceDown: !showFaceUp,
        holeVariant: isMe ? 'gold' : 'purple',
        'aria-label': `${player.name}${isMe ? ', you' : ''}${player.hasFolded ? ', folded' : ''}`,
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
            {player.hasFolded ? (
              <span className={`font-bold uppercase text-red-400 ${tagText}`}>Folded</span>
            ) : null}
          </>
        ),
      }
    })
  }, [players, playerName, actingIndex, revealCards, showSeat])

  const pot = gameState.round.pot

  return (
    <PlayerGoldPanel title="Table">
      <StadiumTableSeats
        feltLayout="player"
        seatCount={players.length}
        seats={seats}
        communityDigits={communityDigits}
        aspectClassName="player-game-felt aspect-[8/5] w-full"
        centerContent={
          pot > 0 ? (
            <span className="player-game-table-pot">Pot ${pot.toLocaleString()}</span>
          ) : null
        }
      />
    </PlayerGoldPanel>
  )
}
