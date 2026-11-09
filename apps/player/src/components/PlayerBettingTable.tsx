import { useState } from 'react'
import { ChipText, digitsAscending, NumericPlayingCard, SidePotMark } from '@qhe/ui'
import { type GameState } from '@qhe/core'
import {
  playerTableMoment,
  playerTablePots,
  playerTableSeatBriefs,
  seatBriefState,
  type PlayerTableSeatBrief,
} from '../playerModel/playerTableBrief'
import { PlayerFeltPot } from './TableFeltView'

type PlayerBettingTableProps = {
  gameState: GameState
  myIndex: number
  /** Tests pin the sheet open. The phone starts closed. */
  open?: boolean
}

function SharedCards({ gameState }: { gameState: GameState }) {
  if (gameState.round.communityCards.length === 0) return null
  const digits = digitsAscending(gameState.round.communityCards.map((card) => card.digit))
  return (
    <div className="player-table-cards" aria-label="Shared cards">
      {digits.map((digit, index) => (
        <span key={`${index}-${digit}`} className="player-table-card">
          <NumericPlayingCard digit={digit} size="small" compact />
        </span>
      ))}
    </div>
  )
}

function SeatRow({ seat }: { seat: PlayerTableSeatBrief }) {
  const state = seatBriefState(seat)
  return (
    <li className={seat.you ? 'player-table-seat player-table-seat--you' : 'player-table-seat'}>
      <span className="player-table-seat-name">{seat.name}</span>
      {seat.you ? <span className="player-table-you">You</span> : null}
      <span className="player-table-seat-stack">
        <ChipText text={`$${seat.bankroll.toLocaleString()}`} />
      </span>
      {state ? <span className="player-table-seat-state">{state}</span> : null}
      {seat.sideMarks.map((mark) => (
        <SidePotMark key={mark} mark={mark} />
      ))}
    </li>
  )
}

export default function PlayerBettingTable({ gameState, myIndex, open = false }: PlayerBettingTableProps) {
  const [shown, setShown] = useState(open)
  const seats = playerTableSeatBriefs(gameState, myIndex)
  const atTable = seats.filter((seat) => !seat.pointsOnly)
  const pots = playerTablePots(gameState)
  return (
    <section className={shown ? 'player-betting-table is-open' : 'player-betting-table'} aria-label="Table">
      <p className="player-table-status" role="status">
        {playerTableMoment(gameState, seats)}
      </p>
      <PlayerFeltPot pot={pots.pot} sides={pots.sides} />
      <SharedCards gameState={gameState} />
      <button
        type="button"
        className="player-table-open"
        aria-expanded={shown}
        onClick={() => setShown((current) => !current)}
      >
        {shown ? 'Hide the table' : 'See the table'}
      </button>
      <ul className="player-table-roster">
        {atTable.map((seat) => (
          <SeatRow key={seat.id} seat={seat} />
        ))}
      </ul>
    </section>
  )
}
