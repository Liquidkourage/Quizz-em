import { useEffect, useState } from 'react'

/** First tap arms it. Second tap leaves the event. */
export function PlayerQuitButton({ onQuit }: { onQuit: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(id)
  }, [armed])

  return (
    <button
      type="button"
      className="player-quit"
      data-armed={armed ? 'true' : 'false'}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          return
        }
        onQuit()
      }}
    >
      {armed ? 'Leave the event' : 'Quit'}
    </button>
  )
}

export function PlayerLeftEvent({
  message = 'You left the event.',
  onJoinAgain,
}: {
  message?: string
  onJoinAgain: () => void
}) {
  return (
    <div className="player-join-screen">
      <div className="player-join-layout">
        <h1 className="player-join-title">{message}</h1>
        <button type="button" className="player-quit" onClick={onJoinAgain}>
          Join again
        </button>
      </div>
    </div>
  )
}
