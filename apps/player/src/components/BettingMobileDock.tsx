import type { PlayerState } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import type { BettingContext } from '../playerModel/bettingModel'
import type { PreAction } from '../playerModel/preAction'
import { preActionArmedLabel } from '../playerModel/preAction'
import WageringActionButtons from './WageringActionButtons'

function wagerHint(ctx: BettingContext): string {
  const minRaiseTo = ctx.toCall + ctx.minRaise
  const verb = ctx.isOpeningBet ? 'bet' : 'raise'
  if (!ctx.isOpeningBet && ctx.toCall > 0) return `Total includes the $${ctx.toCall} call`
  return `Opening ${verb} must be at least $${minRaiseTo}`
}

function LiveWagerFacts({
  currentPlayer,
  ctx,
  banner,
}: {
  currentPlayer: PlayerState
  ctx: BettingContext
  banner: string
}) {
  const minRaiseTo = ctx.toCall + ctx.minRaise
  const verb = ctx.isOpeningBet ? 'Bet' : 'Raise'
  return (
    <div className="player-live-facts">
      <div className="player-game-dock-status" aria-live="polite">
        <span className="player-game-turn-banner">{banner}</span>
        <span className="player-live-facts-wager">Wagering</span>
        <span>
          Stack <strong><ChipText text={`$${currentPlayer.bankroll.toLocaleString()}`} /></strong>
        </span>
      </div>
      <div className="player-game-wager-stack">
        <p className="player-game-stack-label">Your stack</p>
        <p className="player-game-stack-value">
          <ChipText text={`$${currentPlayer.bankroll.toLocaleString()}`} />
        </p>
      </div>
      {ctx.isBettingPhase ? (
        <div className="player-game-stat-grid">
          <div>
            Round <strong>{ctx.isBettingOpen ? 'open' : 'closed'}</strong>
          </div>
          <div>
            To call <strong><ChipText text={`$${ctx.toCall}`} /></strong>
          </div>
          <div>
            Min raise <strong><ChipText text={`$${ctx.minRaise}`} /></strong>
          </div>
          <div>
            Turn{' '}
            <strong className={ctx.isMyTurn ? 'player-game-stat-turn' : ''}>
              {ctx.isMyTurn ? 'Yours' : 'Waiting'}
            </strong>
          </div>
        </div>
      ) : null}
      <p className="player-game-field-label">
        {verb} to <span>(min <ChipText text={`$${minRaiseTo}`} />)</span>
      </p>
      <p className="player-game-raise-min-hint">
        <ChipText text={wagerHint(ctx)} />
      </p>
    </div>
  )
}

function WaitingPreActions({
  ctx,
  preAction,
  onPreActionChange,
}: {
  ctx: BettingContext
  preAction: PreAction | null
  onPreActionChange: (next: PreAction | null) => void
}) {
  const togglePre = (next: PreAction) => {
    if (preAction?.kind === next.kind) {
      onPreActionChange(null)
      return
    }
    onPreActionChange(next)
  }

  return (
    <>
      <p className="player-game-preact-heading">Auto-play on your turn</p>
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
            <ChipText text={`Call / fold${ctx.toCall > 0 ? ` $${ctx.toCall}` : ''}`} />
          </span>
          <span className="player-game-preact-sub">
            <ChipText
              text={ctx.toCall > 0 ? `Call $${ctx.toCall}, fold if raised` : 'Call this bet, fold to a raise'}
            />
          </span>
        </button>
      </div>
      <p className="player-game-preact-hint">Tap again to clear · full controls on your turn</p>
    </>
  )
}

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

  return (
    <div
      className={`player-game-dock player-game-dock--inflow ${
        live ? 'player-game-dock--your-turn' : 'player-game-dock--waiting'
      }`}
    >
      <div className="player-game-dock-inner">
        <LiveWagerFacts
          currentPlayer={currentPlayer}
          ctx={ctx}
          banner={live ? 'Your turn' : preAction ? preActionArmedLabel(preAction) : 'Waiting'}
        />

        {!live ? (
          <WaitingPreActions ctx={ctx} preAction={preAction} onPreActionChange={onPreActionChange} />
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
