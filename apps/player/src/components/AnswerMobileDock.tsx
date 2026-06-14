import { NeonButton } from '@qhe/ui'

type AnswerMobileDockProps = {
  remainingSec: number | null
  canSubmit: boolean
  onClear: () => void
  onSubmit: () => void
}

export default function AnswerMobileDock({ remainingSec, canSubmit, onClear, onSubmit }: AnswerMobileDockProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/85 backdrop-blur-lg lg:hidden"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        paddingTop: '0.75rem',
      }}
    >
      <div className="mx-auto max-w-lg space-y-3">
        <div className="text-center text-sm text-white/85">
          <span className="text-white/60">Time left: </span>
          <span className="text-xl font-extrabold tabular-nums text-casino-gold">
            {remainingSec != null ? `${remainingSec}s` : 'Waiting'}
          </span>
        </div>
        <div className="flex gap-3">
          <NeonButton variant="red" size="normal" className="min-h-[2.75rem] flex-1 !text-sm" onClick={onClear}>
            Clear
          </NeonButton>
          <NeonButton variant="emerald" size="normal" className="min-h-[2.75rem] flex-1 !text-sm" onClick={onSubmit} disabled={!canSubmit}>
            Submit
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
