import { useEffect, useState } from 'react'
import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import { PlayerGameButton } from './PlayerGoldChrome'

const CONFIRM_TIMEOUT_MS = 3000

type WageringActionButtonsProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  pot?: number
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
  pot = 0,
  btnSize = 'large',
  onRaiseAmountChange,
  onCheck,
  onCall,
  onRaise,
  onFold,
  onAllIn,
}: WageringActionButtonsProps) {
  const [foldConfirmPending, setFoldConfirmPending] = useState(false)
  const [allInConfirmPending, setAllInConfirmPending] = useState(false)

  useEffect(() => {
    setFoldConfirmPending(false)
    setAllInConfirmPending(false)
  }, [ctx.isMyTurn, ctx.canFold, ctx.canAllIn, gameTurnKey(ctx)])

  useEffect(() => {
    if (!foldConfirmPending) return undefined
    const t = window.setTimeout(() => setFoldConfirmPending(false), CONFIRM_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [foldConfirmPending])

  useEffect(() => {
    if (!allInConfirmPending) return undefined
    const t = window.setTimeout(() => setAllInConfirmPending(false), CONFIRM_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [allInConfirmPending])

  const maxRaiseBy = Math.max(0, currentPlayer.bankroll - ctx.toCall)
  const showCheck = ctx.canCheck
  const shortAllInCall = ctx.toCall > 0 && currentPlayer.bankroll > 0 && currentPlayer.bankroll <= ctx.toCall
  const showCall = ctx.canCall && !shortAllInCall
  const showRaise = ctx.isMyTurn && maxRaiseBy >= ctx.minRaise
  const showFold = ctx.canFold
  const showAllIn = ctx.canAllIn
  const hasPrimary = showCheck || showCall || shortAllInCall
  const hasSecondary = showFold || showAllIn
  const raiseToTotal = ctx.toCall + raiseAmount

  if (!ctx.isMyTurn) {
    return <p className="player-game-wager-wait">Waiting for other players…</p>
  }

  if (!hasPrimary && !showRaise && !hasSecondary) {
    return null
  }

  const soloBtnClass = 'player-game-btn--block player-game-btn--solo'

  const clampRaiseBy = (n: number) => {
    const stepped = Math.max(ctx.minRaise, Math.min(maxRaiseBy, Math.floor(n)))
    onRaiseAmountChange(stepped)
  }

  const halfPotRaiseBy = Math.max(ctx.minRaise, Math.floor(pot / 2) - ctx.toCall)
  const potRaiseBy = Math.max(ctx.minRaise, pot - ctx.toCall)

  return (
    <>
      {hasPrimary ? (
        <div
          className={`player-game-actions${
            [showCheck, showCall, shortAllInCall].filter(Boolean).length > 1 ? '' : ' player-game-actions--solo'
          }`}
        >
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
          {shortAllInCall ? (
            <PlayerGameButton
              variant="allin"
              size={btnSize}
              className={soloBtnClass}
              onClick={() => {
                if (!allInConfirmPending) {
                  setAllInConfirmPending(true)
                  setFoldConfirmPending(false)
                  return
                }
                setAllInConfirmPending(false)
                onAllIn()
              }}
            >
              {allInConfirmPending ? 'Confirm all-in' : `All-in $${currentPlayer.bankroll}`}
            </PlayerGameButton>
          ) : null}
        </div>
      ) : null}

      {showRaise ? (
        <div className="player-game-raise-block">
          <label className="player-game-field-label">
            Raise by <span>(min ${ctx.minRaise})</span>
          </label>
          <div className="player-game-raise-chips" role="group" aria-label="Raise presets">
            <button
              type="button"
              className="player-game-raise-chip"
              onClick={() => clampRaiseBy(raiseAmount - ctx.minRaise)}
              disabled={raiseAmount <= ctx.minRaise}
            >
              −${ctx.minRaise}
            </button>
            <button
              type="button"
              className="player-game-raise-chip"
              onClick={() => clampRaiseBy(ctx.minRaise)}
            >
              Min
            </button>
            {pot > 0 ? (
              <>
                <button
                  type="button"
                  className="player-game-raise-chip"
                  onClick={() => clampRaiseBy(halfPotRaiseBy)}
                >
                  ½ pot
                </button>
                <button type="button" className="player-game-raise-chip" onClick={() => clampRaiseBy(potRaiseBy)}>
                  Pot
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="player-game-raise-chip"
              onClick={() => clampRaiseBy(raiseAmount + ctx.minRaise)}
              disabled={raiseAmount >= maxRaiseBy}
            >
              +${ctx.minRaise}
            </button>
          </div>
          <p className="player-game-raise-to">
            Raise to <strong>${raiseToTotal}</strong>
            <span> (call ${ctx.toCall} + raise ${raiseAmount})</span>
          </p>
          <div className={`player-game-raise-row${ctx.canRaise ? '' : ' player-game-raise-row--solo'}`}>
            <input
              type="number"
              inputMode="numeric"
              value={raiseAmount}
              onChange={(e) => clampRaiseBy(Number(e.target.value) || 0)}
              min={ctx.minRaise}
              max={maxRaiseBy}
              className="player-game-input player-game-input--raise"
              aria-label="Raise by amount"
            />
            {ctx.canRaise ? (
              <PlayerGameButton variant="dark" size={btnSize} className="player-game-btn--block" onClick={onRaise}>
                Raise to ${raiseToTotal}
              </PlayerGameButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasSecondary ? (
        <div className={`player-game-actions${showFold && showAllIn && !shortAllInCall ? '' : ' player-game-actions--solo'}`}>
          {showFold ? (
            <PlayerGameButton
              variant="fold"
              size={btnSize}
              className={soloBtnClass}
              onClick={() => {
                if (!foldConfirmPending) {
                  setFoldConfirmPending(true)
                  setAllInConfirmPending(false)
                  return
                }
                setFoldConfirmPending(false)
                onFold()
              }}
            >
              {foldConfirmPending ? 'Confirm fold' : 'Fold'}
            </PlayerGameButton>
          ) : null}
          {showAllIn && !shortAllInCall ? (
            <PlayerGameButton
              variant="allin"
              size={btnSize}
              className={soloBtnClass}
              onClick={() => {
                if (!allInConfirmPending) {
                  setAllInConfirmPending(true)
                  setFoldConfirmPending(false)
                  return
                }
                setAllInConfirmPending(false)
                onAllIn()
              }}
            >
              {allInConfirmPending ? 'Confirm all-in' : `All-in $${currentPlayer.bankroll}`}
            </PlayerGameButton>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function gameTurnKey(ctx: BettingContext): string {
  return `${ctx.isMyTurn}:${ctx.toCall}:${ctx.minRaise}:${ctx.currentBet}`
}
