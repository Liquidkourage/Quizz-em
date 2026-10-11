import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'
import type { PreAction } from '../playerModel/preAction'
import { preActionArmedLabel } from '../playerModel/preAction'
import WageringActionButtons from './WageringActionButtons'

type BettingMobileDockProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  pot?: number
  preAction: PreAction | null
  onPreActionChange: (next: PreAction | null) => void
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
    preAction,
    onPreActionChange,
    onRaiseAmountChange,
    onCheck,
    onCall,
    onRaise,
    onFold,
    onAllIn,
  } = props

  const live = ctx.isMyTurn

  const togglePre = (next: PreAction) => {
    if (live) return
    if (preAction?.kind === next.kind) {
      onPreActionChange(null)
      return
    }
    onPreActionChange(next)
  }

  return (
    <div className="player-game-dock player-game-dock--inflow max-lg:block lg:hidden">
      <div className="player-game-dock-inner">
        <div className="player-game-dock-status" aria-live="polite">
          <span className={live ? 'player-game-stat-turn' : undefined}>
            {live ? 'Your turn' : preAction ? preActionArmedLabel(preAction) : 'Waiting'}
          </span>
          <span>
            Stack <strong>${currentPlayer.bankroll.toLocaleString()}</strong>
          </span>
        </div>

        {!live ? (
          <>
            <p className="player-game-preact-heading">When it’s your turn, auto…</p>
            <div className="player-game-preact" role="group" aria-label="Pre-action">
              <button
                type="button"
                className={`player-game-preact-chip${preAction?.kind === 'checkFold' ? ' is-active' : ''}`}
                onClick={() => togglePre({ kind: 'checkFold' })}
              >
                <span className="player-game-preact-title">Check / fold</span>
                <span className="player-game-preact-sub">Check if free, else fold</span>
              </button>
              <button
                type="button"
                className={`player-game-preact-chip${preAction?.kind === 'callAny' ? ' is-active' : ''}`}
                onClick={() => togglePre({ kind: 'callAny' })}
              >
                <span className="player-game-preact-title">Call any</span>
                <span className="player-game-preact-sub">Call whatever it costs</span>
              </button>
              <button
                type="button"
                className={`player-game-preact-chip${preAction?.kind === 'callFold' ? ' is-active' : ''}`}
                onClick={() => togglePre({ kind: 'callFold', maxBet: ctx.currentBet })}
              >
                <span className="player-game-preact-title">
                  Call / fold{ctx.toCall > 0 ? ` $${ctx.toCall}` : ''}
                </span>
                <span className="player-game-preact-sub">
                  {ctx.toCall > 0 ? `Call $${ctx.toCall}, fold if raised` : 'Call this bet, fold to a raise'}
                </span>
              </button>
            </div>
            <p className="player-game-preact-hint">Tap again to clear · full controls on your turn</p>
          </>
        ) : (
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
        )}
      </div>
    </div>
  )
}
