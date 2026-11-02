import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyGame, dealCommunityCards, dealInitialCards, setQuestion, startGame, SAMPLE_QUESTIONS } from '@qhe/core'
import { addVirtualPlayers, advanceVirtualBettingStep, runVirtualPlayerSimulation } from './virtual-players'
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
