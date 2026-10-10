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

  return (
    <div className="player-game-dock player-game-dock--inflow max-lg:block lg:hidden">
      <div className="player-game-dock-inner">
        <div className="player-game-dock-status" aria-live="polite">
          <span>
            Call <strong>${ctx.toCall}</strong>
          </span>
          <span className={ctx.isMyTurn ? 'player-game-stat-turn' : undefined}>
            {ctx.isMyTurn ? 'Your turn' : 'Waiting'}
          </span>
          <span>
            Stack <strong>${currentPlayer.bankroll}</strong>
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
