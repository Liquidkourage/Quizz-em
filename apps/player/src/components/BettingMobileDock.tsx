import { useEffect, useState } from 'react'
import type { PlayerState } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import type { BettingContext } from '../playerModel/bettingModel'
import { autoCallLimitFromInput } from '../playerModel/preAction'
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

function AutoAction({
  limit,
  onChange,
}: {
  limit: number | null
  onChange: (next: number | null) => void
}) {
  const [draft, setDraft] = useState(limit == null ? '' : String(limit))

  useEffect(() => {
    setDraft(limit == null ? '' : String(limit))
  }, [limit])

  return (
    <div className="player-game-preact">
      <p className="player-game-preact-heading">Auto-Action</p>
      <label className="player-game-auto-line">
        <span>Check or call up to</span>
        <input
          className="player-game-input player-game-auto-input"
          inputMode="numeric"
          aria-label="Check or call up to"
          value={draft}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            setDraft(digits)
            onChange(autoCallLimitFromInput(digits))
          }}
        />
      </label>
      <p className="player-game-preact-sub">Otherwise, fold.</p>
    </div>
  )
}

type BettingMobileDockProps = {
  currentPlayer: PlayerState
  ctx: BettingContext
  raiseAmount: number
  pot?: number
  autoCallLimit: number | null
  onAutoCallLimitChange: (next: number | null) => void
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
    autoCallLimit,
    onAutoCallLimitChange,
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
          banner={live ? 'Your turn' : 'Waiting'}
        />

        {!live ? (
          <AutoAction limit={autoCallLimit} onChange={onAutoCallLimitChange} />
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
