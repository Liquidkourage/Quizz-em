import { useEffect } from 'react'
import { PlayerGoldPanel } from './PlayerGoldChrome'

const NUDGE_POPUP_MS = 4500

type PlayerNudgeAlertProps = {
  message: string
  onDone: () => void
}

/** Full-screen flash and a short callout on the phone that was nudged. */
export default function PlayerNudgeAlert({ message, onDone }: PlayerNudgeAlertProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, NUDGE_POPUP_MS)
    return () => window.clearTimeout(timer)
  }, [message, onDone])

  return (
    <div className="player-nudge-alert" role="alertdialog" aria-label="Host nudge" onClick={onDone}>
      <span className="player-nudge-alert-flash" aria-hidden />
      <div className="player-nudge-alert-card">
        <PlayerGoldPanel title="Host nudge">
          <p className="player-nudge-alert-copy">{message}</p>
        </PlayerGoldPanel>
      </div>
    </div>
  )
}
