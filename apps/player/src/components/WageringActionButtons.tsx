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
  pot = 0,
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

  const halfPotRaiseBy = Math.max(ctx.minRaise, Math.floor(pot / 2) - ctx.toCall)
  const potRaiseBy = Math.max(ctx.minRaise, pot - ctx.toCall)
  const previewRaiseBy = (n: number) => Math.max(ctx.minRaise, Math.min(maxRaiseBy, Math.floor(n)))
  const minRaiseTo = ctx.toCall + previewRaiseBy(ctx.minRaise)
  const halfPotRaiseTo = ctx.toCall + previewRaiseBy(halfPotRaiseBy)
  const potRaiseTo = ctx.toCall + previewRaiseBy(potRaiseBy)

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

  const raiseChipDisabled = !live

  if (dense) {
    return (
      <div
        className={`player-game-wager-dense${live ? '' : ' player-game-wager-dense--inactive'}`}
        aria-disabled={!live}
      >
        {hasPrimary ? (
          <div
            className={`player-game-actions${
              [showCheck, showCall, shortAllInCall].filter(Boolean).length > 1
                ? ''
                : ' player-game-actions--solo'
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
          <div className="player-game-raise-block player-game-raise-block--dense">
            <div className="player-game-raise-chips" role="group" aria-label="Raise presets">
              <button
                type="button"
                className="player-game-raise-chip"
                onClick={() => clampRaiseBy(raiseAmount - ctx.minRaise)}
                disabled={raiseChipDisabled || raiseAmount <= ctx.minRaise}
              >
                −${ctx.minRaise}
              </button>
              <button
                type="button"
                className="player-game-raise-chip"
                onClick={() => clampRaiseBy(ctx.minRaise)}
                disabled={raiseChipDisabled}
              >
                Min ${minRaiseTo}
              </button>
              {pot > 0 ? (
                <>
                  <button
                    type="button"
                    className="player-game-raise-chip"
                    onClick={() => clampRaiseBy(halfPotRaiseBy)}
                    disabled={raiseChipDisabled}
                  >
                    ½ ${halfPotRaiseTo}
                  </button>
                  <button
                    type="button"
                    className="player-game-raise-chip"
                    onClick={() => clampRaiseBy(potRaiseBy)}
                    disabled={raiseChipDisabled}
                  >
                    Pot ${potRaiseTo}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="player-game-raise-chip"
                onClick={() => clampRaiseBy(raiseAmount + ctx.minRaise)}
                disabled={raiseChipDisabled || raiseAmount >= maxRaiseBy}
              >
                +${ctx.minRaise}
              </button>
            </div>
            <label className="player-game-raise-custom">
              <span className="player-game-raise-custom-label">{wagerVerb} to</span>
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
                min={ctx.toCall + ctx.minRaise}
                max={ctx.toCall + maxRaiseBy}
                disabled={!live}
                className="player-game-input player-game-input--raise player-game-input--raise-dense"
                aria-label={`Custom ${wagerVerb.toLowerCase()}-to amount`}
              />
            </label>
          </div>
        ) : null}

        {showRaise || hasSecondary ? (
          <div
            className={`player-game-actions player-game-actions--dense-tri${
              [showFold, showRaise, showAllIn && !shortAllInCall].filter(Boolean).length === 1
                ? ' player-game-actions--solo'
                : ''
            }`}
          >
            {foldBtn}
            {showRaise ? (
              <PlayerGameButton
                variant="dark"
                size={btnSize}
                className={soloBtnClass}
                disabled={!live || !ctx.canRaise}
                onClick={onRaise}
              >
                {wagerVerb} ${raiseToTotal}
              </PlayerGameButton>
            ) : null}
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
          <label className="player-game-field-label">
            {wagerVerb} by <span>(min ${ctx.minRaise})</span>
          </label>
          <div className="player-game-raise-chips" role="group" aria-label="Raise presets">
            <button
              type="button"
              className="player-game-raise-chip"
              onClick={() => clampRaiseBy(raiseAmount - ctx.minRaise)}
              disabled={raiseChipDisabled || raiseAmount <= ctx.minRaise}
            >
              −${ctx.minRaise}
            </button>
            <button
              type="button"
              className="player-game-raise-chip"
              onClick={() => clampRaiseBy(ctx.minRaise)}
              disabled={raiseChipDisabled}
            >
              Min ${minRaiseTo}
            </button>
            {pot > 0 ? (
              <>
                <button
                  type="button"
                  className="player-game-raise-chip"
                  onClick={() => clampRaiseBy(halfPotRaiseBy)}
                  disabled={raiseChipDisabled}
                >
                  ½ ${halfPotRaiseTo}
                </button>
                <button
                  type="button"
                  className="player-game-raise-chip"
                  onClick={() => clampRaiseBy(potRaiseBy)}
                  disabled={raiseChipDisabled}
                >
                  Pot ${potRaiseTo}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="player-game-raise-chip"
              onClick={() => clampRaiseBy(raiseAmount + ctx.minRaise)}
              disabled={raiseChipDisabled || raiseAmount >= maxRaiseBy}
            >
              +${ctx.minRaise}
            </button>
          </div>
          <p className="player-game-raise-to">
            {wagerVerb} to <strong>${raiseToTotal}</strong>
            <span>
              {' '}
              ({ctx.isOpeningBet ? `bet $${raiseAmount}` : `call $${ctx.toCall} + raise $${raiseAmount}`})
            </span>
          </p>
          <div className={`player-game-raise-row${showRaise ? '' : ' player-game-raise-row--solo'}`}>
            <input
              type="number"
              inputMode="numeric"
              value={raiseAmount}
              onChange={(e) => clampRaiseBy(Number(e.target.value) || 0)}
              min={ctx.minRaise}
              max={maxRaiseBy}
              disabled={!live}
              className="player-game-input player-game-input--raise"
              aria-label={`${wagerVerb} by amount`}
            />
            <PlayerGameButton
              variant="dark"
              size={btnSize}
              className="player-game-btn--block"
              disabled={!live || !ctx.canRaise}
              onClick={onRaise}
            >
              {wagerVerb} to ${raiseToTotal}
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
