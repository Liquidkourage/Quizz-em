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

  // Not your turn: one compact status strip — no Call $0 / duplicate wait chrome.
  if (!ctx.isMyTurn) {
    return (
      <div className="player-game-dock player-game-dock--inflow player-game-dock--wait max-lg:block lg:hidden">
        <div className="player-game-dock-inner">
          <p className="player-game-wager-wait" aria-live="polite">
            Waiting for other players…
            <span className="player-game-wager-wait-stack">
              Stack <strong>${currentPlayer.bankroll.toLocaleString()}</strong>
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="player-game-dock player-game-dock--inflow max-lg:block lg:hidden">
      <div className="player-game-dock-inner">
        <div className="player-game-dock-status" aria-live="polite">
          <span className="player-game-stat-turn">Your turn</span>
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
