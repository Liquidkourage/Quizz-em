import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  advanceRevealToShowdown,
  composeNumericAnswersFromSevenDigitCards,
  createEmptyGame,
  dealCommunityCards,
  dealInitialCards,
  endRound,
  isSubmittedAnswerComposableFromDeal,
  nearestLegalAnswerToTarget,
  revealAnswer,
  setQuestion,
  startGame,
  SAMPLE_QUESTIONS,
  type GameState,
  type NumericCard,
} from '@qhe/core'
import {
  addVirtualPlayers,
  advanceVirtualBettingStep,
  noteGuessNudge,
  rehearsalAnswerScript,
  runVirtualPlayerSimulation,
  type RehearsalAnswerScript,
} from './virtual-players'
import { seededPassiveRandom } from './test-utils/seeded-random'

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededPassiveRandom(1))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CPU forced action', () => {
  it('folds a cpu who has no chips facing a bet, the same way a player times out', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addVirtualPlayers(gs, 2)
    const [a, b] = gs.players
    gs = {
      ...gs,
      phase: 'betting',
      players: [
        { ...a!, bankroll: 0, isAllIn: false, hasFolded: false, hand: [{ digit: 1 }, { digit: 2 }] },
        { ...b!, bankroll: 1000, isAllIn: false, hasFolded: false, hand: [{ digit: 3 }, { digit: 4 }] },
      ],
      round: {
        ...gs.round,
        isBettingOpen: true,
        currentBet: 100,
        currentPlayerIndex: 0,
        playerBets: { [a!.id]: 0, [b!.id]: 100 },
        lastSeatBettingAction: [null, null],
      },
    }
    const next = advanceVirtualBettingStep(gs)
    expect(next.players[0]!.hasFolded).toBe(true)
    expect(next.round.currentPlayerIndex).not.toBe(0)
  })
})

describe('CPU post-board wagering', () => {
  it('closes round 2 after paced steps (check-around or open-raise)', () => {
    let gs = createEmptyGame('V', '', '1')
    gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    gs = addVirtualPlayers(gs, 4)
    gs = startGame(gs)
    gs = setQuestion(gs, SAMPLE_QUESTIONS[0]!)
    gs = dealInitialCards(gs)
    gs = runVirtualPlayerSimulation(gs)
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.bettingRound).toBe(1)

    gs = dealCommunityCards(gs)
    expect(gs.round.bettingRound).toBe(2)
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.currentBet).toBe(0)

    let steps = 0
    while (gs.round.isBettingOpen && steps < 48) {
      const next = advanceVirtualBettingStep(gs)
      expect(next).not.toBe(gs)
      gs = next
      steps++
    }
    expect(gs.round.isBettingOpen).toBe(false)
    expect(steps).toBeGreaterThan(0)
    expect(steps).toBeLessThan(48)
  })
})

const digit = (n: number): NumericCard => ({ digit: n as NumericCard['digit'] })

function seatIdFor(script: RehearsalAnswerScript, roundId = 'r1'): string {
  for (let i = 0; i < 20_000; i++) {
    const id = `vp:script:${i}`
    if (rehearsalAnswerScript(id, roundId) === script) return id
  }
  throw new Error(script)
}

function answeringTable(ids: string[]): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
  gs = {
    ...gs,
    phase: 'answering',
    players: ids.map((id, i) => ({
      id,
      name: id,
      bankroll: 1000,
      hand: [digit(6), digit((7 + i) % 10)],
      hasFolded: false,
      isAllIn: false,
      answerPoints: 0,
    })),
    round: {
      ...gs.round,
      roundId: 'r1',
      question: { id: 'q', text: 'How many?', answer: 30 },
      communityCards: [1, 2, 3, 4, 5].map(digit),
      pot: ids.length * 20,
      isBettingOpen: false,
      bettingRound: 2 as const,
      handContributions: Object.fromEntries(ids.map((id) => [id, 20])),
    },
  }
  return gs
}

function seven(gs: GameState, index = 0): number[] {
  const player = gs.players[index]!
  return [...player.hand, ...gs.round.communityCards].map((card) => card.digit)
}

describe('CPU answering', () => {
  it('locks a closest guess when a blank seat is nudged', () => {
    const blank = seatIdFor('blank')
    noteGuessNudge(blank)
    const gs = answeringTable([blank])
    const next = advanceVirtualBettingStep(gs)
    expect(next.players[0]!.submittedAnswer).toBe(nearestLegalAnswerToTarget(seven(gs), 30))
  })

  it('leaves a blank seat blank and still locks the next bot', () => {
    const blank = seatIdFor('blank')
    const close = seatIdFor('close')
    const gs = answeringTable([blank, close])
    const next = advanceVirtualBettingStep(gs)
    expect(next.players[0]!.submittedAnswer).toBeUndefined()
    expect(next.players[1]!.submittedAnswer).toBe(nearestLegalAnswerToTarget(seven(gs, 1), 30))
    expect(next.players[1]!.answerComposition).toHaveLength(5)
  })

  it('locks a legal near miss instead of the closest number', () => {
    const gs = answeringTable([seatIdFor('near')])
    const next = advanceVirtualBettingStep(gs)
    const answer = next.players[0]!.submittedAnswer
    const nearest = nearestLegalAnswerToTarget(seven(gs), 30)
    expect(typeof answer).toBe('number')
    expect(isSubmittedAnswerComposableFromDeal(next, next.players[0]!.id, answer!)).toBe(true)
    expect(answer).not.toBe(nearest)
  })

  it('replaces a locked guess the way the edit button does, then stops', () => {
    let gs = answeringTable([seatIdFor('revise')])
    const first = advanceVirtualBettingStep(gs)
    const locked = first.players[0]!.submittedAnswer
    expect(typeof locked).toBe('number')
    const revised = advanceVirtualBettingStep(first)
    expect(revised.players[0]!.submittedAnswer).not.toBe(locked)
    expect(isSubmittedAnswerComposableFromDeal(revised, revised.players[0]!.id, revised.players[0]!.submittedAnswer!)).toBe(true)
    expect(advanceVirtualBettingStep(revised)).toBe(revised)
  })

  it('locks the smallest or largest legal number', () => {
    const gs = answeringTable([seatIdFor('wild')])
    const next = advanceVirtualBettingStep(gs)
    const answer = next.players[0]!.submittedAnswer
    const values = [...composeNumericAnswersFromSevenDigitCards(seven(gs))].sort((a, b) => a - b)
    expect(answer === values[0] || answer === values[values.length - 1]).toBe(true)
  })

  it('walks away during the window and leaves the pot on the table', () => {
    const gs = answeringTable([seatIdFor('leave'), seatIdFor('close')])
    const next = advanceVirtualBettingStep(gs)
    expect(next.players.map((p) => p.id)).toEqual([seatIdFor('close')])
    expect(next.round.pot).toBe(gs.round.pot)
  })

  it('pays the hand after a blank, an edit, a walk-off, and a wild guess', () => {
    const ids = (['leave', 'blank', 'wild', 'revise', 'near', 'close'] as const).map((script) => seatIdFor(script))
    let gs = answeringTable(ids)
    const bankBeforeLeave = gs.players.reduce((sum, p) => sum + p.bankroll, 0) + gs.round.pot
    gs = runVirtualPlayerSimulation(gs)
    const leaver = ids[0]!
    expect(gs.players.some((p) => p.id === leaver)).toBe(false)
    for (const player of gs.players) {
      if (player.submittedAnswer === undefined) continue
      expect(isSubmittedAnswerComposableFromDeal(gs, player.id, player.submittedAnswer)).toBe(true)
    }
    expect(gs.players.find((p) => p.id === ids[1])!.submittedAnswer).toBeUndefined()
    const seatedBank = gs.players.reduce((sum, p) => sum + p.bankroll, 0) + gs.round.pot
    const paid = endRound(advanceRevealToShowdown(revealAnswer(gs)))
    const paidBank = paid.players.reduce((sum, p) => sum + p.bankroll, 0) + paid.round.pot
    expect(paid.phase).toBe('lobby')
    expect(paid.round.pot).toBe(0)
    expect(paidBank).toBe(seatedBank)
    expect(bankBeforeLeave - seatedBank).toBe(1000)
  })
})
