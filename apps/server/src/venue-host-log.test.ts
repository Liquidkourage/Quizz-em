import { describe, expect, it } from 'vitest'
import { createEmptyGame, type GameState } from '@qhe/core'
import {
  attachVenueLastHandSeating,
  buildHostVenueActionRows,
  buildHostVenueFloorBrief,
  clearVenueHostLog,
  getVenueLastHandDisplay,
  recordVenueHostHandResults,
  recordVenueMovesBetweenStates,
  setVenueLastHandDisplay,
  shortPlayerName,
  venueWallLastHandFields,
} from './venue-host-log'

describe('venueWallLastHandFields', () => {
  it('marks a paid hand when nobody busted and nobody moved', () => {
    clearVenueHostLog('QUIET')
    setVenueLastHandDisplay('QUIET', [])
    attachVenueLastHandSeating('QUIET', null)
    const fields = venueWallLastHandFields(getVenueLastHandDisplay('QUIET'))
    expect(typeof fields.lastHandEndMs).toBe('number')
    expect(fields.lastHandBusts).toBeUndefined()
    expect(fields.lastHandSeating).toBeUndefined()
  })

  it('still includes busts and seat moves when they happened', () => {
    clearVenueHostLog('LOUD')
    setVenueLastHandDisplay('LOUD', [{ name: 'Ada', tableNum: 2, atMs: 1 }])
    attachVenueLastHandSeating('LOUD', {
      moves: [{ name: 'Ada', fromTableNum: 2, toTableNum: 1 }],
      closedTableNums: [2],
      shuffled: false,
      tablesBefore: 2,
      tablesAfter: 1,
      playerCount: 3,
    })
    const fields = venueWallLastHandFields(getVenueLastHandDisplay('LOUD'))
    expect(fields.lastHandBusts).toEqual([{ name: 'Ada', tableNum: 2 }])
    expect(fields.lastHandSeating?.moves).toEqual([
      { name: 'Ada', fromTableNum: 2, toTableNum: 1 },
    ])
  })
})

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
    expect(brief.bigBets).toHaveLength(0)
  })

  it('keeps raises, calls, and all-ins that clear the big-win bar', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const smallCall: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 980 } : p,
      ),
      round: {
        ...before.round,
        lastSeatBettingAction: ['call', null],
        playerBets: { 'human:a': 20 },
        currentPlayerIndex: 1,
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, smallCall)

    const bigRaise: GameState = {
      ...smallCall,
      players: smallCall.players.map((p) =>
        p.id === 'human:b' ? { ...p, bankroll: 500 } : p,
      ),
      round: {
        ...smallCall.round,
        currentBet: 500,
        lastSeatBettingAction: ['call', 'raise'],
        playerBets: { 'human:a': 20, 'human:b': 500 },
        currentPlayerIndex: 0,
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, smallCall, bigRaise)

    const beforeShove = bigRaise
    const allIn: GameState = {
      ...beforeShove,
      players: beforeShove.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 0, isAllIn: true } : p,
      ),
      round: {
        ...beforeShove.round,
        lastSeatBettingAction: ['allIn', 'raise'],
        playerBets: { 'human:a': 1000, 'human:b': 500 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, beforeShove, allIn)

    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.bigWinMinAmount).toBe(300)
    expect(brief.bigBets.map((b) => `${b.kind}:${b.amount}:${b.name}`)).toEqual([
      'allIn:980:Alice C.',
      'raise:500:Bob D.',
    ])
    expect(brief.handBets.map((b) => `${b.kind}:${b.amount}:${b.name}`)).toEqual([
      'allIn:980:Alice C.',
      'raise:500:Bob D.',
      'call:20:Alice C.',
    ])
  })

  it('ranks this hand only and drops a table when its next hand starts', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const raised: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:b' ? { ...p, bankroll: 600 } : p,
      ),
      round: {
        ...before.round,
        roundId: 'r1',
        currentBet: 400,
        lastSeatBettingAction: [null, 'raise'],
        playerBets: { 'human:b': 400 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, raised)

    const nextHandBefore: GameState = {
      ...raised,
      players: raised.players.map((p) => ({ ...p, bankroll: 1000 })),
      round: {
        ...raised.round,
        roundId: 'r2',
        currentBet: 20,
        lastSeatBettingAction: [null, null],
        playerBets: {},
      },
    }
    const nextHandRaise: GameState = {
      ...nextHandBefore,
      players: nextHandBefore.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 900 } : p,
      ),
      round: {
        ...nextHandBefore.round,
        currentBet: 100,
        lastSeatBettingAction: ['raise', null],
        playerBets: { 'human:a': 100 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, nextHandBefore, nextHandRaise)

    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.handBets.map((b) => `${b.amount}:${b.name}`)).toEqual(['100:Alice C.'])
  })

  it('hides bets smaller than the big blind from big bets this hand', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const underBlind: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 990 } : p,
      ),
      round: {
        ...before.round,
        lastSeatBettingAction: ['call', null],
        playerBets: { 'human:a': 10 },
        currentPlayerIndex: 1,
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, underBlind)

    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.handBets).toEqual([])
  })
})

describe('buildHostVenueFloorBrief busts', () => {
  it('sends only the busts from the hand that just paid', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const aliceOut = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 0, pointsOnly: true } : p,
      ),
    }
    setVenueLastHandDisplay(
      'LOG',
      recordVenueHostHandResults('LOG', [{ tableNum: 1, before, after: aliceOut }]),
    )
    const bobOut = {
      ...aliceOut,
      players: aliceOut.players.map((p) =>
        p.id === 'human:b' ? { ...p, bankroll: 0, pointsOnly: true } : p,
      ),
    }
    setVenueLastHandDisplay(
      'LOG',
      recordVenueHostHandResults('LOG', [{ tableNum: 2, before: aliceOut, after: bobOut }]),
    )

    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 0,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.busts.map((b) => b.name)).toEqual(['Bob D.'])
  })
})

describe('buildHostVenueActionRows seats', () => {
  it('names who is in the pot and who is points only', () => {
    const rows = buildHostVenueActionRows([
      {
        tableNum: 3,
        seated: 2,
        pot: 0,
        phase: 'betting',
        seatNames: ['Ada', '', 'Bo'],
        seatFolded: [false, false, true],
        seatPointsOnly: [false, false, false],
      } as never,
    ])
    expect(rows[0]?.seats).toEqual([
      { name: 'Ada', kind: 'pot', reason: null },
      { name: 'Bo', kind: 'points', reason: 'folded' },
    ])
  })
})

describe('buildHostVenueFloorBrief stacks', () => {
  it('sends the median stack of seated players', () => {
    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [
        { seatNames: ['Ada', ''], seatBankrolls: [400, 0] } as never,
        { seatNames: ['Bea'], seatBankrolls: [800] } as never,
      ],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.medianStack).toBe(600)
  })
})
