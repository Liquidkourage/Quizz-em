import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import WageringActionButtons from './WageringActionButtons'

type BettingMobileDockProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  onRaiseAmountChange: (n: number) => void
  onCheck: () => void
  onCall: () => void
  onRaise: () => void
  onFold: () => void
  onAllIn: () => void
}

export default function BettingMobileDock(props: BettingMobileDockProps) {
  const { currentPlayer, ctx, raiseAmount, onRaiseAmountChange, onCheck, onCall, onRaise, onFold, onAllIn } = props

  return (
    <div className="player-game-dock max-lg:block lg:hidden">
      <div className="player-game-dock-inner">
        <div className="player-game-stat-grid" style={{ marginBottom: '0.55rem', fontSize: '0.72rem' }}>
          <div>
            To call <strong>${ctx.toCall}</strong>
          </div>
          <div>
            <strong className={ctx.isMyTurn ? 'player-game-stat-turn' : ''}>
              {ctx.isMyTurn ? 'Your turn' : 'Waiting'}
            </strong>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            Stack <strong>${currentPlayer.bankroll}</strong>
          </div>
        </div>
        <div className="player-game-wager-actions">
          <WageringActionButtons
            currentPlayer={currentPlayer}
            ctx={ctx}
            raiseAmount={raiseAmount}
            btnSize="normal"
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
