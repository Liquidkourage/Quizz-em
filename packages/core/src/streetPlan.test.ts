import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, dealCommunityCards, dealHoleCards, openBettingRound1, setQuestion, SAMPLE_QUESTIONS } from './index'
import { acceptedStreetPlan, nextStreetReveal, ORIGINAL_STREET_PLAN, SINGLE_STREET_PLAN, SPLIT_32_STREET_PLAN } from './streetPlan'

function ready(plan?: number[]) {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'a', 'Ada', 1000)
  gs = addPlayer(gs, 'b', 'Bo', 1000)
  gs = { ...gs, phase: 'question', streetPlan: plan }
  gs = setQuestion(gs, SAMPLE_QUESTIONS[0]!)
  gs = dealHoleCards(gs)
  return openBettingRound1(gs)
}

describe('street plan', () => {
  it('keeps the original hand: bet, then all 5 public cards, then bet', () => {
    expect(acceptedStreetPlan([0, 5])).toEqual([0, 5])
    const open = ready([...ORIGINAL_STREET_PLAN])
    expect(open.round.communityCards).toHaveLength(0)
    expect(open.round.bettingRound).toBe(1)
    const paused = { ...open, round: { ...open.round, isBettingOpen: false, currentPlayerIndex: -1 } }
    const dealt = dealCommunityCards(paused)
    expect(dealt.round.communityCards).toHaveLength(5)
    expect(dealt.round.bettingRound).toBe(2)
    expect(dealCommunityCards({ ...dealt, round: { ...dealt.round, isBettingOpen: false } }).round.bettingRound).toBe(2)
  })

  it('puts all 5 public cards on one betting street', () => {
    const open = ready([...SINGLE_STREET_PLAN])
    expect(open.round.communityCards).toHaveLength(5)
    expect(open.round.bettingRound).toBe(1)
    expect(nextStreetReveal(SINGLE_STREET_PLAN, 1)).toBeNull()
    const paused = { ...open, round: { ...open.round, isBettingOpen: false } }
    expect(dealCommunityCards(paused).round.communityCards).toHaveLength(5)
  })

  it('reveals 3 public cards, then the last 2', () => {
    const open = ready([...SPLIT_32_STREET_PLAN])
    expect(open.round.communityCards).toHaveLength(3)
    const paused = { ...open, round: { ...open.round, isBettingOpen: false, currentPlayerIndex: -1 } }
    const dealt = dealCommunityCards(paused)
    expect(dealt.round.communityCards).toHaveLength(5)
    expect(dealt.round.bettingRound).toBe(2)
    expect(dealt.round.streetPlan).toEqual([3, 2])
  })

  it('rejects a plan that does not use exactly 5 public cards', () => {
    expect(acceptedStreetPlan([3, 3])).toBeNull()
    expect(acceptedStreetPlan([1])).toBeNull()
    expect(acceptedStreetPlan([])).toBeNull()
  })
})
