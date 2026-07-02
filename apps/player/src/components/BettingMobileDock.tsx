import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import { PlayerGameButton } from './PlayerGoldChrome'

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
            Call <strong>${ctx.toCall}</strong>
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
        <div className="player-game-actions">
          <PlayerGameButton variant="gold" onClick={onCheck} disabled={!ctx.canCheck}>
            Check
          </PlayerGameButton>
          <PlayerGameButton variant="gold" onClick={onCall} disabled={!ctx.canCall}>
            {ctx.toCall > 0 ? `Call $${ctx.toCall}` : 'Call'}
          </PlayerGameButton>
        </div>
        <div className="player-game-raise-block" style={{ marginTop: '0.45rem' }}>
          <label className="player-game-field-label">
            Raise <span>(min ${ctx.minRaise})</span>
          </label>
          <div className="player-game-raise-row">
            <input
              type="number"
              value={raiseAmount}
              onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
              min={ctx.minRaise}
              max={Math.max(0, currentPlayer.bankroll - ctx.toCall)}
              className="player-game-input player-game-input--raise"
            />
            <PlayerGameButton variant="dark" onClick={onRaise} disabled={!ctx.canRaise}>
              Raise
            </PlayerGameButton>
          </div>
        </div>
        <div className="player-game-actions" style={{ marginTop: '0.45rem' }}>
          <PlayerGameButton variant="fold" onClick={onFold} disabled={!ctx.canFold}>
            Fold
          </PlayerGameButton>
          <PlayerGameButton variant="allin" onClick={onAllIn} disabled={!ctx.canAllIn}>
            All-in
          </PlayerGameButton>
        </div>
      </div>
    </div>
  )
}
