import { useEffect } from 'react'
import { ChipText } from '@qhe/ui'

const AUTO_ACT_MS = 2500

export default function AutoActAlert({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, AUTO_ACT_MS)
    return () => window.clearTimeout(timer)
  }, [message, onDone])

  return (
    <button type="button" className="player-auto-act" onClick={onDone}>
      <ChipText text={message} />
    </button>
  )
}
