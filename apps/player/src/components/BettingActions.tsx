import { Card, NeonButton } from '@qhe/ui'
import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'

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
  const btnClass = compact ? 'min-h-[2.75rem] w-full !px-3 !py-2.5 !text-sm' : 'w-full'

  return (
    <Card variant="glass" className="p-4 sm:p-6">
      <h2 className="mb-4 text-center text-xl font-bold text-casino-emerald sm:text-2xl">Wagering</h2>
      {ctx.isBettingPhase ? (
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-white sm:text-sm">
          <div>
            Round <span className="font-bold">{ctx.isBettingOpen ? 'open' : 'closed'}</span>
          </div>
          <div>
            Stack <span className="font-bold">${currentPlayer.bankroll}</span>
          </div>
          <div>
            To call <span className="font-bold">${ctx.toCall}</span>
          </div>
          <div>
            Turn{' '}
            <span className={`font-bold ${ctx.isMyTurn ? 'text-casino-gold' : ''}`}>
              {ctx.isMyTurn ? 'Yours' : 'Waiting'}
            </span>
          </div>
        </div>
      ) : null}
      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${compact ? '' : ''}`}>
        <NeonButton variant="emerald" size={btnSize} className={btnClass} onClick={onCheck} disabled={!ctx.canCheck}>
          Check
        </NeonButton>
        <NeonButton variant="gold" size={btnSize} className={btnClass} onClick={onCall} disabled={!ctx.canCall}>
          {ctx.toCall > 0 ? `Call $${ctx.toCall}` : 'Call'}
        </NeonButton>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-white/80 sm:text-sm">
            Raise <span className="text-white/50">(min ${ctx.minRaise})</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={raiseAmount}
              onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
              min={ctx.minRaise}
              max={Math.max(0, currentPlayer.bankroll - ctx.toCall)}
              className="min-h-[2.75rem] w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white backdrop-blur-md focus:border-casino-emerald focus:outline-none"
            />
            <NeonButton variant="purple" size={btnSize} className="shrink-0" onClick={onRaise} disabled={!ctx.canRaise}>
              Raise
            </NeonButton>
          </div>
        </div>
        <NeonButton variant="red" size={btnSize} className={btnClass} onClick={onFold} disabled={!ctx.canFold}>
          Fold
        </NeonButton>
        <NeonButton variant="blue" size={btnSize} className={btnClass} onClick={onAllIn} disabled={!ctx.canAllIn}>
          All-in
        </NeonButton>
      </div>
    </Card>
  )
}
