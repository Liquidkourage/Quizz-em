import { describe, expect, it } from 'vitest'
import type { GameState, PlayerState } from '@qhe/core'
import {
  buildPlayerTableStatusLine,
  formatActingCallHint,
  pickHighlightSeatAction,
  resolveSeatStatusPill,
  seatToCallAmount,
} from './seatBettingStatus'

function player(partial: Partial<PlayerState> & Pick<PlayerState, 'id' | 'name'>): PlayerState {
  return {
    bankroll: 500,
    hand: [],
    hasFolded: false,
    isAllIn: false,
    ...partial,
  }
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  const players = [
    player({ id: 'a', name: 'Alex' }),
    player({ id: 'b', name: 'Maya Chen' }),
    player({ id: 'c', name: 'Jay' }),
  ]
  return {
    code: 'TEST',
    tableId: 'T1',
    hostId: 'h',
    createdAt: 0,
    phase: 'betting',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: 8,
    players,
    round: {
      roundId: 'r1',
      question: null,
      communityCards: [],
      pot: 100,
      dealerIndex: 0,
      isBettingOpen: true,
      currentBet: 40,
      currentPlayerIndex: 2,
      playerBets: { a: 20, b: 40, c: 0 },
      lastSeatBettingAction: ['call', 'raise', null],
    },
    ...overrides,
  }
}

describe('seatBettingStatus', () => {
  it('formats acting call hint', () => {
    expect(formatActingCallHint(0)).toBe('Acting')
    expect(formatActingCallHint(40)).toBe('Call $40')
  })

  it('computes to-call from street bets', () => {
    const p = player({ id: 'c', name: 'Jay' })
    expect(seatToCallAmount(p, 40, { c: 0 })).toBe(40)
    expect(seatToCallAmount(p, 40, { c: 40 })).toBe(0)
  })

  it('prefers acting pill over last action', () => {
    const pill = resolveSeatStatusPill({
      player: player({ id: 'c', name: 'Jay' }),
      isActing: true,
      lastAction: 'call',
      toCall: 40,
    })
    expect(pill).toEqual({ kind: 'acting', label: 'Call $40' })
  })

  it('shows fold pill when folded without last action', () => {
    const pill = resolveSeatStatusPill({
      player: player({ id: 'a', name: 'Alex', hasFolded: true }),
      isActing: false,
      lastAction: null,
      toCall: 0,
    })
    expect(pill).toEqual({ kind: 'action', action: 'fold', label: 'FOLD' })
  })

  it('picks highest-priority highlight excluding actor', () => {
    const gs = baseState()
    const hit = pickHighlightSeatAction(gs.players, gs.round.lastSeatBettingAction, 2)
    expect(hit).toEqual({ seatIndex: 1, action: 'raise' })
  })

  it('builds status line with highlight and to-call', () => {
    const line = buildPlayerTableStatusLine(baseState(), 'Alex')
    expect(line).toBe('Maya raised · Jay to call $40')
  })

  it('uses You for the viewer when acting', () => {
    const gs = baseState({
      round: {
        ...baseState().round,
        currentPlayerIndex: 0,
        playerBets: { a: 40, b: 40, c: 40 },
        currentBet: 40,
        lastSeatBettingAction: [null, 'call', null],
      },
    })
    expect(buildPlayerTableStatusLine(gs, 'Alex')).toBe('Maya called · You to act')
  })

  it('returns no more bets when wagering paused', () => {
    const gs = baseState({
      round: {
        ...baseState().round,
        isBettingOpen: false,
        currentPlayerIndex: -1,
      },
    })
    expect(buildPlayerTableStatusLine(gs, 'Alex')).toBe('No more bets')
  })

  it('returns answer cue during answering', () => {
    expect(buildPlayerTableStatusLine(baseState({ phase: 'answering' }), 'Alex')).toBe(
      'Answer on your phone',
    )
  })
})
