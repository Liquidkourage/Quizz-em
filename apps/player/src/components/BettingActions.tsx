import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import { PlayerGoldPanel } from './PlayerGoldChrome'
import WageringActionButtons from './WageringActionButtons'

type BettingActionsProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  onRaiseAmountChange: (n: number) => void
  onCheck: () => void
  onCall: () => void
  onRaise: () => void
  onFold: () => void
  onAllIn: () => void
  compact?: boolean
}

export default function BettingActions({
  currentPlayer,
  ctx,
  raiseAmount,
  onRaiseAmountChange,
  onCheck,
  onCall,
  onRaise,
  onFold,
  onAllIn,
  compact,
}: BettingActionsProps) {
  const btnSize = compact ? 'normal' : 'large'

  return (
    <PlayerGoldPanel title="Wagering">
      <div className="player-game-wager-stack">
        <p className="player-game-stack-label">Your stack</p>
        <p className="player-game-stack-value">${currentPlayer.bankroll}</p>
        {currentPlayer.hasFolded ? <p className="player-game-folded">Folded this hand</p> : null}
      </div>

      {ctx.isBettingPhase ? (
        <div className="player-game-stat-grid">
          <div>
            Round <strong>{ctx.isBettingOpen ? 'open' : 'closed'}</strong>
          </div>
          <div>
            To call <strong>${ctx.toCall}</strong>
          </div>
          <div>
            Min raise <strong>${ctx.minRaise}</strong>
          </div>
          <div>
            Turn{' '}
            <strong className={ctx.isMyTurn ? 'player-game-stat-turn' : ''}>
              {ctx.isMyTurn ? 'Yours' : 'Waiting'}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="player-game-wager-actions">
        <WageringActionButtons
          currentPlayer={currentPlayer}
          ctx={ctx}
          raiseAmount={raiseAmount}
          btnSize={btnSize}
          onRaiseAmountChange={onRaiseAmountChange}
          onCheck={onCheck}
          onCall={onCall}
          onRaise={onRaise}
          onFold={onFold}
          onAllIn={onAllIn}
        />
      </div>
    </PlayerGoldPanel>
  )
}
