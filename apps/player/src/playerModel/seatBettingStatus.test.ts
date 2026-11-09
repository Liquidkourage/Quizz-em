import { describe, expect, it } from 'vitest'
import type { GameState, PlayerState } from '@qhe/core'
import {
  buildPlayerTableStatusLine,
  formatActingCallHint,
  formatMergedSeatStatus,
  pickHighlightSeatAction,
  resolveSeatStatusPill,
  rosterDisplayName,
  runoutAnswerLine,
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
      lastPerformedAction: { seatIndex: 1, action: 'raise' },
    },
    ...overrides,
  }
}

describe('seatBettingStatus', () => {
  it('formats acting call hint', () => {
    expect(formatActingCallHint(0)).toBe('Acting')
    expect(formatActingCallHint(40)).toBe('Call $40')
  })

  it('keeps last initial on roster labels', () => {
    expect(rosterDisplayName('Jay B.')).toBe('Jay B.')
    expect(rosterDisplayName('Jay C.')).toBe('Jay C.')
    expect(rosterDisplayName('Maya Chen')).toBe('Maya C.')
    expect(rosterDisplayName('Blake')).toBe('Blake')
    expect(rosterDisplayName('Chris L. 2')).toBe('Chris L. 2')
  })

  it('merges street-in into status labels', () => {
    expect(formatMergedSeatStatus({ action: 'call', streetIn: 20, isAllIn: false })).toBe(
      'CALL · $20',
    )
    expect(formatMergedSeatStatus({ action: 'raise', streetIn: 40, isAllIn: false })).toBe(
      'RAISE · $40',
    )
    expect(formatMergedSeatStatus({ action: null, streetIn: 10, isAllIn: false })).toBe('$10 in')
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
      streetIn: 0,
    })
    expect(pill).toEqual({ kind: 'acting', label: 'Call $40' })
  })

  it('shows away when offline with no action', () => {
    const pill = resolveSeatStatusPill({
      player: player({ id: 'a', name: 'Alex' }),
      isActing: false,
      lastAction: null,
      toCall: 0,
      streetIn: 0,
      isAway: true,
    })
    expect(pill).toEqual({ kind: 'away', label: 'AWAY' })
  })

  it('shows fold pill when folded without last action', () => {
    const pill = resolveSeatStatusPill({
      player: player({ id: 'a', name: 'Alex', hasFolded: true }),
      isActing: false,
      lastAction: null,
      toCall: 0,
      streetIn: 0,
    })
    expect(pill).toEqual({ kind: 'action', action: 'fold', label: 'FOLD' })
  })

  it('picks highest-priority highlight excluding actor', () => {
    const gs = baseState()
    const hit = pickHighlightSeatAction(gs.players, gs.round.lastSeatBettingAction, 2)
    expect(hit).toEqual({ seatIndex: 1, action: 'raise' })
  })

  it('shows the action just taken, not an earlier bigger bet', () => {
    const gs = baseState({
      round: {
        ...baseState().round,
        lastPerformedAction: { seatIndex: 0, action: 'check' },
        lastSeatBettingAction: ['check', 'raise', null],
      },
    })
    expect(buildPlayerTableStatusLine(gs, 'Jay')).toBe('Alex checked · You to call $40')
  })

  it('keeps the last action on screen after betting closes', () => {
    const gs = baseState({
      round: {
        ...baseState().round,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        lastPerformedAction: { seatIndex: 1, action: 'call' },
      },
    })
    expect(buildPlayerTableStatusLine(gs, 'Alex')).toBe('Maya called · No more bets')
  })

  it('calls a numbered Chris by the number, not the first name alone', () => {
    const gs = baseState({
      players: [
        player({ id: 'a', name: 'Alex' }),
        player({ id: 'b', name: 'Chris L. 2' }),
        player({ id: 'c', name: 'Jay' }),
      ],
      round: {
        ...baseState().round,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        lastPerformedAction: { seatIndex: 1, action: 'call' },
      },
    })
    expect(buildPlayerTableStatusLine(gs, 'Alex')).toBe('Chris 2 called · No more bets')
    expect(buildPlayerTableStatusLine(gs, 'Chris L. 2')).toBe('You called · No more bets')
  })

  it('builds status line with highlight, to-call, and clock', () => {
    const line = buildPlayerTableStatusLine(baseState(), 'Alex', 18)
    expect(line).toBe('Maya raised · Jay to call $40 · act in 18s')
  })

  it('uses You for the viewer when acting', () => {
    const gs = baseState({
      round: {
        ...baseState().round,
        currentPlayerIndex: 0,
        playerBets: { a: 40, b: 40, c: 40 },
        currentBet: 40,
        lastSeatBettingAction: [null, 'call', null],
        lastPerformedAction: { seatIndex: 1, action: 'call' },
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
        lastPerformedAction: undefined,
      },
    })
    expect(buildPlayerTableStatusLine(gs, 'Alex')).toBe('No more bets')
  })

  it('returns answer cue during answering', () => {
    expect(buildPlayerTableStatusLine(baseState({ phase: 'answering' }), 'Alex')).toBe(
      'Answer on your phone',
    )
  })

  it('clears the answer cue once this seat missed the guess', () => {
    expect(buildPlayerTableStatusLine(baseState({ phase: 'answering' }), 'Alex', null, true)).toBe(
      null,
    )
  })
})

describe('runoutAnswerLine', () => {
  const open = 'Your answer opens as soon as the five community cards are out.'

  it('tells a folded player they folded, not that they are all-in', () => {
    expect(runoutAnswerLine(player({ id: 'a', name: 'Alex', hasFolded: true }))).toBe(
      `You folded. ${open}`,
    )
  })

  it('keeps the all-in line for a player who is actually all-in', () => {
    expect(runoutAnswerLine(player({ id: 'a', name: 'Alex', isAllIn: true, bankroll: 0 }))).toBe(
      `All-in. ${open}`,
    )
  })

  it('does not call a points-only player all-in', () => {
    expect(runoutAnswerLine(player({ id: 'a', name: 'Alex', pointsOnly: true }))).toBe(open)
  })
})
