import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LOBBY_TABLE_ID,
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
  buildSidePotSettlement,
  type GameState,
  type NumericCard,
} from '@qhe/core'
import {
  addVirtualPlayers,
  advanceVirtualBettingStep,
  noteGuessNudge,
  rehearsalAnswerScript,
  rehearsalBetScript,
  runVirtualPlayerSimulation,
  type RehearsalAnswerScript,
  type RehearsalBetScript,
} from './virtual-players'
import { seededPassiveRandom } from './test-utils/seeded-random'

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededPassiveRandom(1))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CPU roster cap', () => {
  it('keeps adding in the lobby after 32 seats', () => {
    let gs = createEmptyGame('V', 'h', LOBBY_TABLE_ID)
    gs = { ...gs, maxPlayers: 32, players: [] }
    gs = addVirtualPlayers(gs, 33)
    expect(gs.players).toHaveLength(33)
  })

  it('stops a felt at 8 seats', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = { ...gs, maxPlayers: 32 }
    gs = addVirtualPlayers(gs, 20)
    expect(gs.players).toHaveLength(8)
  })
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

function betSeat(script: RehearsalBetScript, street = 1): string {
  for (let i = 0; i < 20_000; i++) {
    const id = `vp:bet:${i}`
    if (rehearsalBetScript(id, 'r1', street) === script) return id
  }
  throw new Error(script)
}

function bettingSeat(
  id: string,
  bankroll: number,
  contributed: number,
) {
  return {
    id,
    name: id,
    bankroll,
    hand: [digit(1), digit(2)],
    hasFolded: false,
    isAllIn: false,
    answerPoints: 0,
    contributed,
  }
}

function bettingTable(
  seats: ReturnType<typeof bettingSeat>[],
  toAct: number,
  currentBet: number,
) {
  const playerBets = Object.fromEntries(seats.map((seat) => [seat.id, seat.contributed]))
  let gs = createEmptyGame('V', 'h', '1')
  gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
  return {
    ...gs,
    phase: 'betting' as const,
    players: seats.map(({ contributed: _contributed, ...player }) => player),
    round: {
      ...gs.round,
      roundId: 'r1',
      isBettingOpen: true,
      bettingRound: 1 as const,
      currentBet,
      currentPlayerIndex: toAct,
      pot: Object.values(playerBets).reduce((sum, n) => sum + n, 0),
      playerBets,
      handContributions: { ...playerBets },
      lastFullRaiseAmount: 20,
      lastSeatBettingAction: seats.map((seat, index) => (seat.contributed > 0 && index !== toAct ? 'raise' as const : null)),
    },
  }
}

describe('CPU betting edge cases', () => {
  it('jams the whole stack', () => {
    const id = betSeat('shove')
    const gs = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 20),
    ], 0, 20)
    const next = advanceVirtualBettingStep(gs)
    expect(next.players[0]!.isAllIn).toBe(true)
    expect(next.players[0]!.bankroll).toBe(0)
  })

  it('folds a bet and checks when nothing is owed', () => {
    const id = betSeat('fold')
    const facing = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 40),
    ], 0, 40)
    expect(advanceVirtualBettingStep(facing).players[0]!.hasFolded).toBe(true)

    const free = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 0),
    ], 0, 0)
    const checked = advanceVirtualBettingStep(free)
    expect(checked.players[0]!.hasFolded).toBe(false)
    expect(checked.round.lastSeatBettingAction?.[0]).toBe('check')
  })

  it('opens a quiet street, then folds if someone bets', () => {
    const id = betSeat('steal')
    const quiet = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 0),
    ], 0, 0)
    const opened = advanceVirtualBettingStep(quiet)
    expect(opened.round.currentBet).toBe(20)
    expect(opened.players[0]!.hasFolded).toBe(false)

    const facing = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 40),
    ], 0, 40)
    expect(advanceVirtualBettingStep(facing).players[0]!.hasFolded).toBe(true)
  })

  it('checks for free, then raises a bet', () => {
    const id = betSeat('trap')
    const free = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 0),
    ], 0, 0)
    const checked = advanceVirtualBettingStep(free)
    expect(checked.round.lastSeatBettingAction?.[0]).toBe('check')

    const facing = bettingTable([
      bettingSeat(id, 1000, 0),
      bettingSeat(betSeat('flat'), 1000, 20),
    ], 0, 20)
    const raised = advanceVirtualBettingStep(facing)
    expect(raised.round.currentBet).toBeGreaterThan(20)
    expect(raised.players[0]!.hasFolded).toBe(false)
  })

  it('walks away during a live bet and leaves the pot on the table', () => {
    const id = betSeat('leave')
    const gs = bettingTable([
      bettingSeat(id, 800, 20),
      bettingSeat(betSeat('flat'), 800, 20),
    ], 0, 20)
    const next = advanceVirtualBettingStep(gs)
    expect(next.players.map((p) => p.id)).toEqual([betSeat('flat')])
    expect(next.round.pot).toBe(gs.round.pot)
  })

  it('jams short of the bet so the call builds a side pot', () => {
    const short = betSeat('shove')
    const caller = betSeat('flat')
    const opener = betSeat('open')
    let gs: GameState = bettingTable([
      bettingSeat(opener, 400, 100),
      bettingSeat(short, 40, 0),
      bettingSeat(caller, 400, 0),
    ], 1, 100)
    gs = advanceVirtualBettingStep(gs)
    expect(gs.players[1]!.isAllIn).toBe(true)
    expect(gs.round.playerBets?.[short]).toBe(40)
    expect(gs.round.currentBet).toBe(100)
    gs = advanceVirtualBettingStep(gs)
    expect(gs.round.playerBets?.[caller]).toBe(100)
    const pots = buildSidePotSettlement(gs.round.handContributions ?? {}, {
      [opener]: false,
      [short]: false,
      [caller]: false,
    }).pots
    expect(pots).toHaveLength(2)
    expect(pots[0]!.eligiblePlayerIds).toContain(short)
    expect(pots[1]!.eligiblePlayerIds).not.toContain(short)
  })
})

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
