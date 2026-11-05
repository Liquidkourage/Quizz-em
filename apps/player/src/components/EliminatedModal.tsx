import { useEffect } from 'react'
import { ELIMINATION_POPUP_MS } from '../playerModel/eliminationPopup'
import { EliminatedNotice } from './EliminatedScreen'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type EliminatedModalProps = {
  name: string
  onDone: () => void
}

/** Timed bust callout over the table after this seat is paid out of the chip contest. */
export default function EliminatedModal({ name, onDone }: EliminatedModalProps) {
  const who = name.trim() || 'You'
  useEffect(() => {
    const timer = window.setTimeout(onDone, ELIMINATION_POPUP_MS)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className="player-eliminated-popup"
      role="dialog"
      aria-modal="true"
      aria-label={`${who}, out of chips`}
    >
      <div className="player-game-modal-backdrop" aria-hidden />
      <div className="player-eliminated-popup-card">
        <PlayerGoldPanel>
          <EliminatedNotice name={who} />
        </PlayerGoldPanel>
      </div>
    </div>
  )
}
