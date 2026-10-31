import { useEffect } from 'react'
import { NumericPlayingCard } from '@qhe/ui'
import { DEAL_FLASH_MS, type DealFlash } from '../playerModel/dealFlash'

type DealFlashModalProps = {
  flash: DealFlash
  onDone: () => void
}

export default function DealFlashModal({ flash, onDone }: DealFlashModalProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, DEAL_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [flash, onDone])

  const title = flash.kind === 'holes' ? 'Your cards' : 'Board'
  const board = flash.kind === 'street'

  return (
    <div className="player-deal-flash" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="player-deal-flash-backdrop" aria-label="Dismiss" onClick={onDone} />
      <div className="player-deal-flash-card">
        <p className="player-deal-flash-title">{title}</p>
        <div className={board ? 'player-deal-flash-cards player-deal-flash-cards--board' : 'player-deal-flash-cards'}>
          {flash.digits.map((digit, i) => (
            <NumericPlayingCard
              key={`${flash.kind}-${i}-${digit}`}
              digit={digit}
              size={board ? 'small' : 'normal'}
              compact
              animated={false}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
