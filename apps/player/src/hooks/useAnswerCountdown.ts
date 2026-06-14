import { useEffect, useState } from 'react'
import { nowOnServerClock } from '../serverClock'

export function useAnswerCountdown(answerDeadline: number | undefined | null): number | null {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (answerDeadline == null || !Number.isFinite(answerDeadline)) return undefined
    const id = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [answerDeadline])

  if (answerDeadline == null || !Number.isFinite(answerDeadline) || answerDeadline <= 0) {
    return null
  }
  void tick
  return Math.max(0, Math.ceil((answerDeadline - nowOnServerClock()) / 1000))
}
