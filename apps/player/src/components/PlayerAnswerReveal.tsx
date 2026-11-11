import { useEffect, useRef, useState } from 'react'
import { ANSWER_REVEAL_BEFORE_WINNERS_MS, shownTriviaNumber, type GamePhase, type GameState } from '@qhe/core'
import { nextPlayerAnswerReveal } from '../playerModel/playerAnswerReveal'

type OpenReveal = {
  question: string
  answer: number
}

export function usePlayerAnswerReveal(gameState: GameState): OpenReveal | null {
  const [open, setOpen] = useState<OpenReveal | null>(null)
  const prevPhase = useRef<GamePhase | null>(null)
  const shownKey = useRef<string | null>(null)
  const timer = useRef<number | null>(null)
  const question = gameState.round.question

  useEffect(() => {
    const key = nextPlayerAnswerReveal({
      prevPhase: prevPhase.current,
      phase: gameState.phase,
      question: question?.text,
      answer: question?.answer,
      shownKey: shownKey.current,
    })
    prevPhase.current = gameState.phase
    if (key == null || typeof question?.answer !== 'number') return
    shownKey.current = key
    setOpen({ question: question.text.trim(), answer: question.answer })
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setOpen(null)
    }, ANSWER_REVEAL_BEFORE_WINNERS_MS)
  }, [gameState.phase, question])

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    }
  }, [])

  return open
}

export function PlayerAnswerRevealHost({ gameState }: { gameState: GameState }) {
  const open = usePlayerAnswerReveal(gameState)
  if (open == null) return null
  return <PlayerAnswerReveal question={open.question} answer={open.answer} />
}

export default function PlayerAnswerReveal({ question, answer }: OpenReveal) {
  return (
    <div
      className="player-answer-reveal"
      role="dialog"
      aria-modal="true"
      aria-label={`The answer is ${shownTriviaNumber(answer, { text: question })}`}
    >
      <div className="player-answer-reveal-card">
        <div className="player-answer-reveal-head">
          <h2 className="player-answer-reveal-title">The answer is</h2>
          <span className="player-answer-reveal-clock" aria-hidden>
            <svg viewBox="0 0 36 36">
              <circle className="player-answer-reveal-clock-track" cx="18" cy="18" r="15" />
              <circle
                className="player-answer-reveal-clock-value"
                cx="18"
                cy="18"
                r="15"
                pathLength={100}
                style={{ animationDuration: `${ANSWER_REVEAL_BEFORE_WINNERS_MS}ms` }}
              />
            </svg>
          </span>
        </div>
        <div className="player-answer-reveal-body">
          <p className="player-answer-reveal-question">{question}</p>
          <p className="player-answer-reveal-number">{shownTriviaNumber(answer, { text: question })}</p>
        </div>
      </div>
    </div>
  )
}
