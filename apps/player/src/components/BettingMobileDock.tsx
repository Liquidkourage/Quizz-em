import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import WageringActionButtons from './WageringActionButtons'

type BettingMobileDockProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  pot?: number
  onRaiseAmountChange: (n: number) => void
  onCheck: () => void
  onCall: () => void
  onRaise: () => void
  onFold: () => void
  onAllIn: () => void
}

export default function BettingMobileDock(props: BettingMobileDockProps) {
  const {
    currentPlayer,
    ctx,
    raiseAmount,
    pot,
    onRaiseAmountChange,
    onCheck,
    onCall,
    onRaise,
    onFold,
    onAllIn,
  } = props

  const live = ctx.isMyTurn

  return (
    <div
      className={`player-game-dock player-game-dock--inflow max-lg:block lg:hidden${
        live ? '' : ' player-game-dock--inactive'
      }`}
    >
      <div className="player-game-dock-inner">
        <div className="player-game-dock-status" aria-live="polite">
          <span className={live ? 'player-game-stat-turn' : undefined}>
            {live ? 'Your turn' : 'Waiting'}
          </span>
          <span>
            Stack <strong>${currentPlayer.bankroll.toLocaleString()}</strong>
          </span>
        </div>
        <div className="player-game-wager-actions">
          <WageringActionButtons
            currentPlayer={currentPlayer}
            ctx={ctx}
            raiseAmount={raiseAmount}
            pot={pot}
            btnSize="normal"
            dense
            onRaiseAmountChange={onRaiseAmountChange}
            onCheck={onCheck}
            onCall={onCall}
            onRaise={onRaise}
            onFold={onFold}
            onAllIn={onAllIn}
          />
        </div>
      </div>
    </div>
  )
}
