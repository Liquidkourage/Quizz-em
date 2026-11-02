import { useEffect, useState } from 'react'
import { answerSecondsRemaining } from './answerCountdown'
import { nowOnServerClock } from './serverClock'

/**
 * Live answer-clock seconds. State lives here so a tick does not re-render the felts.
 * Pass the same interval the screen already used: 250 ms on the venue wall, 200 ms on the hero strip.
 */
export function useAnswerSecondsLeft(deadlineMs: number | null, tickMs: number): number | null {
  const [seconds, setSeconds] = useState<number | null>(() =>
    deadlineMs == null ? null : answerSecondsRemaining(deadlineMs, nowOnServerClock()),
  )

  useEffect(() => {
    if (deadlineMs == null) {
      setSeconds(null)
      return
    }
    const tick = () => setSeconds(answerSecondsRemaining(deadlineMs, nowOnServerClock()))
    tick()
    const id = window.setInterval(tick, tickMs)
    return () => window.clearInterval(id)
  }, [deadlineMs, tickMs])

  return seconds
}
