import {
  adminCloseBetting,
  dealCommunityCards,
  dealHoleCards,
  openBettingRound1,
  pickRandomQuestion,
  playersHaveHoleCards,
  revealAnswer,
  setQuestion,
  startGame,
  type GameState,
  type Question,
} from '@qhe/core'
import { isPostBoardWageringClosed, openAnsweringPhase } from './venue-wagering-orchestration'
import { runVirtualPlayerSimulation } from './virtual-players'

const MAX_FAST_FORWARD_STEPS = 800

/** CPU-only rehearsal: advance one felt to showdown with real cards, answers, and pot. */
export function fastForwardTableToShowdown(gs: GameState, fallbackQuestion: Question): GameState {
  if (gs.phase === 'showdown' || gs.phase === 'reveal') {
    return gs
  }

  let s = gs

  if (s.phase === 'lobby') {
    s = startGame(s)
  }

  if (s.phase === 'question') {
    if (s.round.question == null) {
      s = setQuestion(s, fallbackQuestion)
    }
    if (!playersHaveHoleCards(s)) {
      s = dealHoleCards(s)
    }
    if (s.phase === 'question' && s.round.question != null && playersHaveHoleCards(s)) {
      s = openBettingRound1(s)
    }
  }

  for (let i = 0; i < MAX_FAST_FORWARD_STEPS; i++) {
    if (s.phase === 'showdown' || s.phase === 'reveal') break

    if (s.phase === 'answering') {
      s = runVirtualPlayerSimulation(s)
      s = revealAnswer(s)
      break
    }

    if (s.phase === 'betting') {
      s = runVirtualPlayerSimulation(s)
      if (s.phase !== 'betting') continue

      if (s.round.isBettingOpen) {
        s = adminCloseBetting(s)
        continue
      }

      if (s.round.bettingRound === 1 && (s.round.communityCards?.length ?? 0) < 5) {
        s = dealCommunityCards(s)
        s = runVirtualPlayerSimulation(s)
        continue
      }

      if (isPostBoardWageringClosed(s)) {
        s = openAnsweringPhase(s, Date.now())
        s = runVirtualPlayerSimulation(s)
        s = revealAnswer(s)
        break
      }

      continue
    }

    if (s.phase === 'question') {
      if (!playersHaveHoleCards(s)) {
        s = dealHoleCards(s)
        continue
      }
      if (s.round.question != null) {
        s = openBettingRound1(s)
        continue
      }
      break
    }

    if (s.phase === 'lobby') {
      s = startGame(s)
      continue
    }

    break
  }

  if (s.phase === 'answering') {
    s = runVirtualPlayerSimulation(s)
    s = revealAnswer(s)
  }

  return s
}

export function rehearsalFallbackQuestion(bank: Question[]): Question {
  return (
    pickRandomQuestion(bank) ?? {
      id: 'rehearsal-fallback-q',
      text: 'In whole minutes, boiling point of pure water at standard atmospheric pressure?',
      answer: 100,
    }
  )
}
