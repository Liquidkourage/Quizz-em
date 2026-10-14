import { describe, expect, it } from 'vitest'
import { createEmptyGame, type GameState } from '@qhe/core'
import {
  buildHostVenueFloorBrief,
  clearVenueHostLog,
  recordVenueMovesBetweenStates,
  shortPlayerName,
} from './venue-host-log'

describe('shortPlayerName', () => {
  it('formats First L.', () => {
    expect(shortPlayerName('Jay Williams')).toBe('Jay W.')
    expect(shortPlayerName('Alice C.')).toBe('Alice C.')
    expect(shortPlayerName('CPU 3')).toBe('CPU 3')
  })
})

function baseTable(): GameState {
  let gs = createEmptyGame('LOG', 'host', '1')
  gs = {
    ...gs,
    phase: 'betting',
    players: [
      {
        id: 'human:a',
        name: 'Alice C.',
        bankroll: 1000,
        hand: [],
        hasFolded: false,
        isAllIn: false,
      },
      {
        id: 'human:b',
        name: 'Bob D.',
        bankroll: 1000,
        hand: [],
        hasFolded: false,
        isAllIn: false,
      },
    ],
    round: {
      ...gs.round,
      isBettingOpen: true,
      currentBet: 20,
      currentPlayerIndex: 0,
      lastSeatBettingAction: [null, null],
      playerBets: {},
    },
  }
  return gs
}

describe('recordVenueMovesBetweenStates', () => {
  it('logs checks, raises, and answer submits into the floor brief move log', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const afterCheck: GameState = {
      ...before,
      round: {
        ...before.round,
        lastSeatBettingAction: ['check', null],
        currentPlayerIndex: 1,
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, afterCheck)

    const afterRaise: GameState = {
      ...afterCheck,
      round: {
        ...afterCheck.round,
        currentBet: 40,
        lastSeatBettingAction: ['check', 'raise'],
        playerBets: { 'human:b': 40 },
        currentPlayerIndex: 0,
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, afterCheck, afterRaise)

    const beforeSubmit: GameState = {
      ...afterRaise,
      phase: 'answering',
      players: afterRaise.players.map((p) => ({ ...p })),
    }
    const afterSubmit: GameState = {
      ...beforeSubmit,
      players: beforeSubmit.players.map((p) =>
        p.id === 'human:a' ? { ...p, submittedAnswer: 42 } : p,
      ),
    }
    recordVenueMovesBetweenStates('LOG', 1, beforeSubmit, afterSubmit)

    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.moveLog).toHaveLength(3)
    expect(brief.moveLog.some((m) => m.kind === 'check' && m.summary.includes('Alice'))).toBe(true)
    expect(brief.moveLog.some((m) => m.kind === 'raise' && m.summary.includes('Bob'))).toBe(true)
    expect(brief.moveLog.some((m) => m.kind === 'submit' && m.summary.includes('42'))).toBe(true)
    expect(brief.moveLog.every((m) => m.tableNum === 1)).toBe(true)
  })
})
