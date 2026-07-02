import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import { PlayerGameButton } from './PlayerGoldChrome'

type WageringActionButtonsProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  btnSize?: 'normal' | 'large'
  onRaiseAmountChange: (n: number) => void
  onCheck: () => void
  onCall: () => void
  onRaise: () => void
  onFold: () => void
  onAllIn: () => void
}

export default function WageringActionButtons({
  currentPlayer,
  ctx,
  raiseAmount,
  btnSize = 'large',
  onRaiseAmountChange,
  onCheck,
  onCall,
  onRaise,
  onFold,
  onAllIn,
}: WageringActionButtonsProps) {
  const showCheck = ctx.canCheck
  const showCall = ctx.canCall
  const showRaise = ctx.isMyTurn && currentPlayer.bankroll > ctx.toCall
  const showFold = ctx.canFold
  const showAllIn = ctx.canAllIn
  const hasPrimary = showCheck || showCall
  const hasSecondary = showFold || showAllIn

  if (!ctx.isMyTurn) {
    return (
      <p className="player-game-wager-wait">Waiting for other players…</p>
    )
  }

  if (!hasPrimary && !showRaise && !hasSecondary) {
    return null
  }

  const soloBtnClass = 'player-game-btn--block player-game-btn--solo'

  return (
    <>
      {hasPrimary ? (
        <div className={`player-game-actions${showCheck && showCall ? '' : ' player-game-actions--solo'}`}>
          {showCheck ? (
            <PlayerGameButton variant="gold" size={btnSize} className={soloBtnClass} onClick={onCheck}>
              Check
            </PlayerGameButton>
          ) : null}
          {showCall ? (
            <PlayerGameButton variant="gold" size={btnSize} className={soloBtnClass} onClick={onCall}>
              Call ${ctx.toCall}
            </PlayerGameButton>
          ) : null}
        </div>
      ) : null}

      {showRaise ? (
        <div className="player-game-raise-block">
          <label className="player-game-field-label">
            Raise <span>(min ${ctx.minRaise})</span>
          </label>
          <div className={`player-game-raise-row${ctx.canRaise ? '' : ' player-game-raise-row--solo'}`}>
            <input
              type="number"
              value={raiseAmount}
              onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
              min={ctx.minRaise}
              max={Math.max(0, currentPlayer.bankroll - ctx.toCall)}
              className="player-game-input player-game-input--raise"
            />
            {ctx.canRaise ? (
              <PlayerGameButton variant="dark" size={btnSize} className="player-game-btn--block" onClick={onRaise}>
                Raise
              </PlayerGameButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasSecondary ? (
        <div className={`player-game-actions${showFold && showAllIn ? '' : ' player-game-actions--solo'}`}>
          {showFold ? (
            <PlayerGameButton variant="fold" size={btnSize} className={soloBtnClass} onClick={onFold}>
              Fold
            </PlayerGameButton>
          ) : null}
          {showAllIn ? (
            <PlayerGameButton variant="allin" size={btnSize} className={soloBtnClass} onClick={onAllIn}>
              All-in
            </PlayerGameButton>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
