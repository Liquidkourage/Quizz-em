import { NeonButton } from '@qhe/ui'
import type { PlayerState } from '@qhe/core'
import type { BettingContext } from '../playerModel/bettingModel'

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
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/85 backdrop-blur-lg lg:hidden"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        paddingTop: '0.5rem',
      }}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex flex-wrap justify-center gap-x-2 text-center text-[11px] text-white/80">
          <span>
            Call <span className="font-bold">${ctx.toCall}</span>
          </span>
          <span className="text-white/35">·</span>
          <span className={ctx.isMyTurn ? 'font-bold text-casino-gold' : ''}>{ctx.isMyTurn ? 'Your turn' : 'Waiting'}</span>
          <span className="text-white/35">·</span>
          <span>
            Stack <span className="font-bold text-casino-gold">${currentPlayer.bankroll}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NeonButton variant="emerald" size="normal" className="min-h-[2.75rem] !text-sm" onClick={onCheck} disabled={!ctx.canCheck}>
            Check
          </NeonButton>
          <NeonButton variant="gold" size="normal" className="min-h-[2.75rem] !text-sm" onClick={onCall} disabled={!ctx.canCall}>
            {ctx.toCall > 0 ? `Call $${ctx.toCall}` : 'Call'}
          </NeonButton>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            value={raiseAmount}
            onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
            min={ctx.minRaise}
            max={Math.max(0, currentPlayer.bankroll - ctx.toCall)}
            className="min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 p-2 text-sm text-white"
          />
          <NeonButton variant="purple" size="normal" className="min-h-[2.75rem] shrink-0 !px-4 !text-sm" onClick={onRaise} disabled={!ctx.canRaise}>
            Raise
          </NeonButton>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NeonButton variant="red" size="normal" className="min-h-[2.75rem] !text-sm" onClick={onFold} disabled={!ctx.canFold}>
            Fold
          </NeonButton>
          <NeonButton variant="blue" size="normal" className="min-h-[2.75rem] !text-sm" onClick={onAllIn} disabled={!ctx.canAllIn}>
            All-in
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
