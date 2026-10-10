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
  /** Phone dock — fewer rows, no custom amount field. */
  dense?: boolean
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
  pot: _pot = 0,
  btnSize = 'large',
  dense = false,
  onRaiseAmountChange,
  onCheck,
  onCall,
  onRaise,
  onFold,
  onAllIn,
}: WageringActionButtonsProps) {
  const [foldConfirmPending, setFoldConfirmPending] = useState(false)
  const [allInConfirmPending, setAllInConfirmPending] = useState(false)

  /** Controls stay visible for everyone; only the acting seat can press them. */
  const live = ctx.isMyTurn

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
  const shortAllInCall =
    ctx.toCall > 0 && currentPlayer.bankroll > 0 && currentPlayer.bankroll <= ctx.toCall
  // Preview affordances from stack/to-call — not gated on whose turn it is.
  const showCheck = ctx.toCall === 0
  const showCall = ctx.toCall > 0 && !shortAllInCall && currentPlayer.bankroll > 0
  const showRaise = maxRaiseBy >= ctx.minRaise
  const showFold = true
  const showAllIn = currentPlayer.bankroll > 0
  const hasPrimary = showCheck || showCall || shortAllInCall
  const hasSecondary = showFold || showAllIn
  const raiseToTotal = ctx.toCall + raiseAmount
  const wagerVerb = ctx.isOpeningBet ? 'Bet' : 'Raise'

  if (!hasPrimary && !showRaise && !hasSecondary) {
    return null
  }

  const soloBtnClass = 'player-game-btn--block player-game-btn--solo'

  const clampRaiseBy = (n: number) => {
    if (!live) return
    const stepped = Math.max(ctx.minRaise, Math.min(maxRaiseBy, Math.floor(n)))
    onRaiseAmountChange(stepped)
  }

  const minRaiseTo = ctx.toCall + ctx.minRaise

  const foldBtn = showFold ? (
    <PlayerGameButton
      variant="fold"
      size={btnSize}
      className={soloBtnClass}
      disabled={!live}
      onClick={() => {
        if (!live) return
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
  ) : null

  const allInBtn =
    showAllIn && !shortAllInCall ? (
      <PlayerGameButton
        variant="allin"
        size={btnSize}
        className={soloBtnClass}
        disabled={!live}
        onClick={() => {
          if (!live) return
          if (!allInConfirmPending) {
            setAllInConfirmPending(true)
            setFoldConfirmPending(false)
            return
          }
          setAllInConfirmPending(false)
          onAllIn()
        }}
      >
        {allInConfirmPending ? 'Confirm all-in' : dense ? 'All-in' : `All-in $${currentPlayer.bankroll}`}
      </PlayerGameButton>
    ) : null

  if (dense) {
    const primaryBtn = showCheck ? (
      <PlayerGameButton
        variant="gold"
        size={btnSize}
        className={soloBtnClass}
        disabled={!live}
        onClick={onCheck}
      >
        Check
      </PlayerGameButton>
    ) : showCall ? (
      <PlayerGameButton
        variant="gold"
        size={btnSize}
        className={soloBtnClass}
        disabled={!live}
        onClick={onCall}
      >
        Call ${ctx.toCall}
      </PlayerGameButton>
    ) : shortAllInCall ? (
      <PlayerGameButton
        variant="allin"
        size={btnSize}
        className={soloBtnClass}
        disabled={!live}
        onClick={() => {
          if (!live) return
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
    ) : null

    return (
      <div
        className={`player-game-wager-dense${live ? '' : ' player-game-wager-dense--inactive'}`}
        aria-disabled={!live}
      >
        {/* Row 1: Call/Check | [$amount] Raise — or primary alone if no raise. */}
        {hasPrimary || showRaise ? (
          <div
            className={
              hasPrimary && showRaise
                ? 'player-game-dense-top'
                : `player-game-actions${hasPrimary || showRaise ? ' player-game-actions--solo' : ''}`
            }
          >
            {hasPrimary && showRaise ? (
              <>
                {primaryBtn}
                <div className="player-game-raise-compact-field">
                  <span className="player-game-raise-compact-label">min ${minRaiseTo}</span>
                  <div className="player-game-raise-compact-pair">
                    <PlayerGameButton
                      variant="dark"
                      size={btnSize}
                      className={`${soloBtnClass} player-game-raise-compact-go`}
                      disabled={!live || !ctx.canRaise}
                      onClick={onRaise}
                    >
                      {wagerVerb}
                    </PlayerGameButton>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={raiseToTotal}
                      onChange={(e) => {
                        const typedTo = Number(e.target.value)
                        if (!Number.isFinite(typedTo)) {
                          clampRaiseBy(ctx.minRaise)
                          return
                        }
                        clampRaiseBy(typedTo - ctx.toCall)
                      }}
                      min={minRaiseTo}
                      max={ctx.toCall + maxRaiseBy}
                      disabled={!live}
                      className="player-game-input player-game-input--raise player-game-input--raise-dense"
                      aria-label={`${wagerVerb} to amount, minimum ${minRaiseTo}`}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {primaryBtn}
                {showRaise ? (
                  <div className="player-game-raise-compact-row">
                    <div className="player-game-raise-compact-field">
                      <span className="player-game-raise-compact-label">
                        {wagerVerb} to · min ${minRaiseTo}
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={raiseToTotal}
                        onChange={(e) => {
                          const typedTo = Number(e.target.value)
                          if (!Number.isFinite(typedTo)) {
                            clampRaiseBy(ctx.minRaise)
                            return
                          }
                          clampRaiseBy(typedTo - ctx.toCall)
                        }}
                        min={minRaiseTo}
                        max={ctx.toCall + maxRaiseBy}
                        disabled={!live}
                        className="player-game-input player-game-input--raise player-game-input--raise-dense"
                        aria-label={`${wagerVerb} to amount, minimum ${minRaiseTo}`}
                      />
                    </div>
                    <PlayerGameButton
                      variant="dark"
                      size={btnSize}
                      className={`${soloBtnClass} player-game-raise-compact-go`}
                      disabled={!live || !ctx.canRaise}
                      onClick={onRaise}
                    >
                      {wagerVerb} ${raiseToTotal}
                    </PlayerGameButton>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {/* Row 2: Fold | All-in */}
        {hasSecondary ? (
          <div
            className={`player-game-actions${
              showFold && showAllIn && !shortAllInCall ? '' : ' player-game-actions--solo'
            }`}
          >
            {foldBtn}
            {allInBtn}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={`player-game-wager-full${live ? '' : ' player-game-wager-full--inactive'}`}
      aria-disabled={!live}
    >
      {hasPrimary ? (
        <div
          className={`player-game-actions${
            [showCheck, showCall, shortAllInCall].filter(Boolean).length > 1 ? '' : ' player-game-actions--solo'
          }`}
        >
          {showCheck ? (
            <PlayerGameButton
              variant="gold"
              size={btnSize}
              className={soloBtnClass}
              disabled={!live}
              onClick={onCheck}
            >
              Check
            </PlayerGameButton>
          ) : null}
          {showCall ? (
            <PlayerGameButton
              variant="gold"
              size={btnSize}
              className={soloBtnClass}
              disabled={!live}
              onClick={onCall}
            >
              Call ${ctx.toCall}
            </PlayerGameButton>
          ) : null}
          {shortAllInCall ? (
            <PlayerGameButton
              variant="allin"
              size={btnSize}
              className={soloBtnClass}
              disabled={!live}
              onClick={() => {
                if (!live) return
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
          <label className="player-game-field-label" htmlFor="player-raise-to-input">
            {wagerVerb} to <span>(min ${minRaiseTo})</span>
          </label>
          <p className="player-game-raise-min-hint">
            {!ctx.isOpeningBet && ctx.toCall > 0
              ? `Total includes the $${ctx.toCall} call`
              : `Opening ${wagerVerb.toLowerCase()} must be at least $${minRaiseTo}`}
          </p>
          <div className="player-game-raise-row">
            <input
              id="player-raise-to-input"
              type="number"
              inputMode="numeric"
              value={raiseToTotal}
              onChange={(e) => {
                const typedTo = Number(e.target.value)
                if (!Number.isFinite(typedTo)) {
                  clampRaiseBy(ctx.minRaise)
                  return
                }
                clampRaiseBy(typedTo - ctx.toCall)
              }}
              min={minRaiseTo}
              max={ctx.toCall + maxRaiseBy}
              disabled={!live}
              className="player-game-input player-game-input--raise"
              aria-label={`${wagerVerb} to amount, minimum ${minRaiseTo}`}
            />
            <PlayerGameButton
              variant="dark"
              size={btnSize}
              className="player-game-btn--block"
              disabled={!live || !ctx.canRaise}
              onClick={onRaise}
            >
              {wagerVerb} ${raiseToTotal}
            </PlayerGameButton>
          </div>
        </div>
      ) : null}

      {hasSecondary ? (
        <div
          className={`player-game-actions${showFold && showAllIn && !shortAllInCall ? '' : ' player-game-actions--solo'}`}
        >
          {foldBtn}
          {allInBtn}
        </div>
      ) : null}
    </div>
  )
}

function gameTurnKey(ctx: BettingContext): string {
  return `${ctx.isMyTurn}:${ctx.toCall}:${ctx.minRaise}:${ctx.currentBet}`
}
