import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import { PlayerGameButton, PlayerGoldPanel } from './PlayerGoldChrome'

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
      {ctx.isBettingPhase ? (
        <div className="player-game-stat-grid">
          <div>
            Round <strong>{ctx.isBettingOpen ? 'open' : 'closed'}</strong>
          </div>
          <div>
            Stack <strong>${currentPlayer.bankroll}</strong>
          </div>
          <div>
            To call <strong>${ctx.toCall}</strong>
          </div>
          <div>
            Turn{' '}
            <strong className={ctx.isMyTurn ? 'player-game-stat-turn' : ''}>
              {ctx.isMyTurn ? 'Yours' : 'Waiting'}
            </strong>
          </div>
        </div>
      ) : null}
      <div className="player-game-actions">
        <PlayerGameButton variant="gold" size={btnSize} className="player-game-btn--block" onClick={onCheck} disabled={!ctx.canCheck}>
          Check
        </PlayerGameButton>
        <PlayerGameButton variant="gold" size={btnSize} className="player-game-btn--block" onClick={onCall} disabled={!ctx.canCall}>
          {ctx.toCall > 0 ? `Call $${ctx.toCall}` : 'Call'}
        </PlayerGameButton>
        <div className="player-game-raise-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="player-game-field-label">
              Raise <span>(min ${ctx.minRaise})</span>
            </label>
            <input
              type="number"
              value={raiseAmount}
              onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
              min={ctx.minRaise}
              max={Math.max(0, currentPlayer.bankroll - ctx.toCall)}
              className="player-game-input"
            />
          </div>
          <PlayerGameButton variant="dark" size={btnSize} className="player-game-btn--block" style={{ alignSelf: 'flex-end' }} onClick={onRaise} disabled={!ctx.canRaise}>
            Raise
          </PlayerGameButton>
        </div>
        <PlayerGameButton variant="fold" size={btnSize} className="player-game-btn--block" onClick={onFold} disabled={!ctx.canFold}>
          Fold
        </PlayerGameButton>
        <PlayerGameButton variant="allin" size={btnSize} className="player-game-btn--block" onClick={onAllIn} disabled={!ctx.canAllIn}>
          All-in
        </PlayerGameButton>
      </div>
    </PlayerGoldPanel>
  )
}
