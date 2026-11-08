import type { GamePhase } from '@qhe/core'

function revealKey(question: string | null | undefined, answer: number | null | undefined): string | null {
  const text = question?.trim() ?? ''
  if (text.length === 0 || typeof answer !== 'number' || !Number.isFinite(answer)) return null
  return `${answer}|${text}`
}

function phaseShowsAnswer(phase: GamePhase): boolean {
  return phase === 'reveal' || phase === 'showdown'
}

/** Opens the correct-answer card once, when this phone first sees the answer released. */
export function nextPlayerAnswerReveal(args: {
  prevPhase: GamePhase | null
  phase: GamePhase
  question: string | null | undefined
  answer: number | null | undefined
  shownKey: string | null
}): string | null {
  if (args.prevPhase == null || !phaseShowsAnswer(args.phase) || phaseShowsAnswer(args.prevPhase)) return null
  const key = revealKey(args.question, args.answer)
  if (key == null || args.shownKey === key) return null
  return key
}
