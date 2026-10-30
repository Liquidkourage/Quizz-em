import { createEmptyGame, type GameState, type PlayerState } from '@qhe/core'
import { describe, expect, it } from 'vitest'
import { handSecretsArePublic, redactGameStateForViewer } from './audience-view'

function seat(partial: Partial<PlayerState> & Pick<PlayerState, 'id' | 'name'>): PlayerState {
  return {
    bankroll: 1000,
    hand: [],
    hasFolded: false,
    isAllIn: false,
    ...partial,
  }
}

function handInProgress(): GameState {
  const gs = createEmptyGame('ROOM', 'host-1', '1')
  gs.phase = 'betting'
  gs.players = [
    seat({
      id: 'ada',
      name: 'Ada',
      hand: [{ digit: 1 }, { digit: 4 }],
      submittedAnswer: 1440,
      answerComposition: [
        { source: 'hole', index: 0 },
        { source: 'hole', index: 1 },
        { source: 'community', index: 0 },
        { source: 'community', index: 1 },
        { source: 'community', index: 2 },
      ],
    }),
    seat({
      id: 'bea',
      name: 'Bea',
      hand: [{ digit: 1 }, { digit: 5 }],
    }),
  ]
  gs.round.question = {
    id: 'q1',
    text: 'How many minutes are in a day?',
    answer: 1440,
    category: 'Math',
  }
  gs.round.communityCards = [
    { digit: 4 },
    { digit: 0 },
    { digit: 2 },
    { digit: 3 },
    { digit: 9 },
  ]
  return gs
}

describe('redactGameStateForViewer', () => {
  it('keeps the full hand for the host', () => {
    const gs = handInProgress()
    const view = redactGameStateForViewer(gs, { role: 'host' })
    expect(view).toBe(gs)
    expect(view.round.question?.answer).toBe(1440)
    expect(view.players[1]?.hand.map((c) => c.digit)).toEqual([1, 5])
  })

  it('gives a player their own cards and guess, and withholds everyone else’s', () => {
    const gs = handInProgress()
    const view = redactGameStateForViewer(gs, { role: 'player', playerId: 'ada' })
    const wire = JSON.parse(JSON.stringify(view)) as GameState
    expect(wire.round.question?.text).toBe('How many minutes are in a day?')
    expect(wire.round.question && 'answer' in wire.round.question).toBe(false)
    expect(wire.round.communityCards.map((c) => c.digit)).toEqual([4, 0, 2, 3, 9])
    const ada = wire.players[0]!
    const bea = wire.players[1]!
    expect(ada.hand.map((c) => c.digit)).toEqual([1, 4])
    expect(ada.submittedAnswer).toBe(1440)
    expect(ada.answerComposition).toHaveLength(5)
    expect(bea.hand).toEqual([])
    expect(bea.holesDealt).toBe(true)
    expect(bea.submittedAnswer).toBeUndefined()
    expect(bea.answerComposition).toBeUndefined()
    expect(gs.players[1]?.hand.map((c) => c.digit)).toEqual([1, 5])
    expect(gs.round.question?.answer).toBe(1440)
  })

  it('marks a locked guess without the number', () => {
    const gs = handInProgress()
    gs.phase = 'answering'
    const view = redactGameStateForViewer(gs, { role: 'player', playerId: 'bea' })
    const ada = view.players[0]!
    expect(ada.submittedAnswer).toBeUndefined()
    expect(ada.answerComposition).toBeUndefined()
    expect(ada.answerLocked).toBe(true)
    expect(ada.holesDealt).toBe(true)
    expect(view.players[1]?.hand.map((c) => c.digit)).toEqual([1, 5])
  })

  it('fails closed for a display and for an unknown role', () => {
    const gs = handInProgress()
    for (const viewer of [{ role: 'display' }, { role: undefined }, {}]) {
      const view = redactGameStateForViewer(gs, viewer)
      expect(view.round.question && 'answer' in (view.round.question as object)).toBe(false)
      expect(view.players.every((p) => p.hand.length === 0 && p.holesDealt === true)).toBe(true)
      expect(view.players[0]?.submittedAnswer).toBeUndefined()
      expect(view.players[0]?.answerLocked).toBe(true)
    }
  })

  it('sends the answer and every hole card once the hand is public', () => {
    expect(handSecretsArePublic('question')).toBe(false)
    expect(handSecretsArePublic('betting')).toBe(false)
    expect(handSecretsArePublic('answering')).toBe(false)
    for (const phase of ['reveal', 'showdown', 'payout'] as const) {
      const gs = handInProgress()
      gs.phase = phase
      const view = redactGameStateForViewer(gs, { role: 'display' })
      expect(view).toBe(gs)
      expect(view.round.question?.answer).toBe(1440)
      expect(view.players[1]?.hand.map((c) => c.digit)).toEqual([1, 5])
    }
  })
})
