import { useEffect, useState } from 'react'
import type { BlindChangeNotice } from '@qhe/net'
import { ChipText } from '@qhe/ui'

export const BLIND_CHANGE_MS = 4500

export function blindChangeMoney(smallBlind: number, bigBlind: number): string {
  const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  return `${money(smallBlind)} / ${money(bigBlind)}`
}

export default function BlindChangeModal({ notice }: { notice: BlindChangeNotice }) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), BLIND_CHANGE_MS)
    return () => window.clearTimeout(timer)
  }, [notice.atMs])

  if (!open) return null

  return (
    <div className="player-deal-flash player-blind-change" role="dialog" aria-modal="true" aria-label="Blinds changed">
      <button type="button" className="player-deal-flash-backdrop" aria-label="Dismiss" onClick={() => setOpen(false)} />
      <div className="player-deal-flash-card">
        <p className="player-deal-flash-title">Blinds</p>
        <p className="player-deal-flash-amount">
          <ChipText text={blindChangeMoney(notice.smallBlind, notice.bigBlind)} />
        </p>
      </div>
    </div>
  )
}
