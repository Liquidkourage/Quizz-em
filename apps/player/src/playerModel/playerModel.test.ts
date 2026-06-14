import { describe, expect, it } from 'vitest'
import { createEmptyGame, LOBBY_TABLE_ID } from '@qhe/core'
import {
  ANSWER_CARD_COUNT,
  toggleCardInSelection,
  validateAnswerSubmit,
} from './answerComposition'
import { buildBettingContext, resolveMyPlayerIndex } from './bettingModel'
import { buildHandSummary, captureHandBaseline, triviaPointsForAnswer } from './handSummary'

describe('answerComposition', () => {
  it('requires five cards before submit', () => {
    expect(validateAnswerSubmit('answering', [], { digits: [], display: '', value: 0 })).toMatch(/5 digit/)
  })

  it('adds and removes cards from selection', () => {
    let gs = createEmptyGame('HOST01', 'host', '1')
    gs = {
      ...gs,
      phase: 'answering',
      players: [
        {
          id: 'p1',
          name: 'Alice',
          bankroll: 1000,
          hand: [{ digit: 3 }, { digit: 7 }],
          hasFolded: false,
          isAllIn: false,
        },
      ],
      round: {
        ...gs.round,
        communityCards: [{ digit: 1 }, { digit: 2 }, { digit: 4 }, { digit: 5 }, { digit: 6 }],
      },
    }
    const player = gs.players[0]!
    let selected: { type: 'hand' | 'community'; index: number }[] = []
    let composed = { digits: [] as (number | 'decimal')[], display: '', value: 0 }

    for (const ref of [
      { type: 'hand' as const, index: 0 },
      { type: 'hand' as const, index: 1 },
      { type: 'community' as const, index: 0 },
      { type: 'community' as const, index: 1 },
      { type: 'community' as const, index: 2 },
    ]) {
      const next = toggleCardInSelection({
        gameState: gs,
        currentPlayer: player,
        selected,
        composed,
        ...ref,
      })
      selected = next.selected
      composed = next.composed
    }
    expect(selected).toHaveLength(ANSWER_CARD_COUNT)
    expect(composed.display).toBe('37124')
    expect(validateAnswerSubmit('answering', selected, composed)).toBeNull()
  })
})

describe('bettingModel', () => {
  it('detects my turn by socket id', () => {
    let gs = createEmptyGame('HOST01', 'host', '1')
    gs = {
      ...gs,
      phase: 'betting',
      players: [
        { id: 'a', name: 'Alice', bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
        { id: 'b', name: 'Bob', bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
      ],
      round: {
        ...gs.round,
        isBettingOpen: true,
        currentPlayerIndex: 1,
        currentBet: 20,
        playerBets: { b: 20 },
        bettingRound: 1,
      },
      bigBlind: 20,
      smallBlind: 10,
    }
    expect(resolveMyPlayerIndex(gs, 'Bob', 'b')).toBe(1)
    const ctx = buildBettingContext({
      gameState: gs,
      currentPlayer: gs.players[1],
      myIndex: 1,
      raiseAmount: 20,
    })
    expect(ctx.isMyTurn).toBe(true)
    expect(ctx.canCheck).toBe(true)
  })
})

describe('handSummary', () => {
  it('computes stack and trivia deltas', () => {
    const baseline = captureHandBaseline({
      id: 'p1',
      name: 'Alice',
      bankroll: 1000,
      hand: [],
      hasFolded: false,
      isAllIn: false,
      answerPoints: 50,
    })!
    const summary = buildHandSummary({
      baseline,
      player: {
        id: 'p1',
        name: 'Alice',
        bankroll: 1300,
        hand: [],
        hasFolded: false,
        isAllIn: false,
        answerPoints: 90,
        submittedAnswer: 42,
      },
      questionAnswer: 40,
      foldedDuringHand: false,
    })
    expect(summary.stackDelta).toBe(300)
    expect(summary.pointsGained).toBe(40)
    expect(summary.triviaPointsThisHand).toBe(98)
  })

  it('scores zero trivia when folded', () => {
    expect(triviaPointsForAnswer(5, 5, true)).toBe(0)
  })
})

describe('lobby join', () => {
  it('defaults table to LOBBY', () => {
    const gs = createEmptyGame('VENUE', 'host', LOBBY_TABLE_ID)
    expect(gs.tableId).toBe(LOBBY_TABLE_ID)
  })
})
