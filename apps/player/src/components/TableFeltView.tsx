import { useMemo } from 'react'
import { Card, StadiumTableSeats, type StadiumTableSeat } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

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
    [gameState.round.communityCards]
  )

  const seats = useMemo((): StadiumTableSeat[] => {
    return players.map((player, index) => {
      const isMe = player.name === playerName
      const isActing = actingIndex === index && !player.hasFolded
      const hasHand = player.hand.length >= 2
      const showFaceUp = isMe || revealCards
      const holeDigits: readonly [number, number] | null =
        hasHand && !player.hasFolded ? [player.hand[0]!.digit, player.hand[1]!.digit] : null

      const tagText = 'text-[0.65rem] sm:text-xs leading-tight'

      return {
        index,
        label: showSeat ? index + 1 : seatInitials(player.name),
        labelClassName: 'font-mono text-[9px] tabular-nums sm:text-[10px]',
        state: player.hasFolded ? 'folded' : isActing ? 'acting' : 'default',
        holeDigits,
        faceDown: !showFaceUp,
        holeVariant: isMe ? 'gold' : 'purple',
        'aria-label': `${player.name}${isMe ? ', you' : ''}${player.hasFolded ? ', folded' : ''}`,
        nameTag: (
          <>
            <span
              className={`max-w-full truncate font-bold ${isMe ? 'text-casino-gold' : 'text-casino-emerald'} ${tagText}`}
            >
              {isMe ? 'You' : firstName(player.name)}
            </span>
            <span className={`font-bold tabular-nums text-casino-gold ${tagText}`}>
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
    <Card variant="glass" className="mt-4 p-3 sm:mt-6 sm:p-4">
      <h2 className="mb-3 text-center text-lg font-bold text-casino-emerald sm:text-xl">Table</h2>
      <StadiumTableSeats
        seatCount={players.length}
        seats={seats}
        communityDigits={communityDigits}
        aspectClassName="aspect-[8/5] w-full max-w-2xl"
        centerContent={
          pot > 0 ? (
            <span className="rounded border border-emerald-500/35 bg-black/50 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-200 sm:text-sm">
              Pot ${pot.toLocaleString()}
            </span>
          ) : null
        }
      />
    </Card>
  )
}
