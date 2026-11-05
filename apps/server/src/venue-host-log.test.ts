import { describe, expect, it } from 'vitest'
import { createEmptyGame, type GameState } from '@qhe/core'
import {
  attachVenueLastHandSeating,
  buildHostVenueActionRows,
  actingClockSince,
  buildHostVenueFloorBrief,
  clearVenueHostLog,
  rememberVenueTriviaField,
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
    expect(brief.wallView).toBe('floor')
  })

  it('reports the public display mode the TVs are on', () => {
    const brief = buildHostVenueFloorBrief({
      venueCode: 'TV',
      tiles: [],
      fieldPlayerCount: 0,
      liveTableCount: 0,
      bigBlindHint: 20,
      wallView: 'leaderboard',
    })
    expect(brief.wallView).toBe('leaderboard')
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

  it('keeps a bet on this hand only when it is at least five big blinds', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const fourBlinds: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 920 } : p,
      ),
      round: {
        ...before.round,
        lastSeatBettingAction: ['call', null],
        playerBets: { 'human:a': 80 },
        currentPlayerIndex: 1,
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, fourBlinds)

    const fiveBlinds: GameState = {
      ...fourBlinds,
      players: fourBlinds.players.map((p) =>
        p.id === 'human:b' ? { ...p, bankroll: 900 } : p,
      ),
      round: {
        ...fourBlinds.round,
        currentBet: 100,
        lastSeatBettingAction: ['call', 'raise'],
        playerBets: { 'human:a': 80, 'human:b': 100 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, fourBlinds, fiveBlinds)

    const brief = buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(brief.handBets.map((b) => `${b.amount}:${b.name}`)).toEqual(['100:Bob D.'])
  })

  function handBetLines() {
    return buildHostVenueFloorBrief({
      venueCode: 'LOG',
      tiles: [],
      fieldPlayerCount: 2,
      liveTableCount: 1,
      bigBlindHint: 20,
    }).handBets.map((b) => `${b.kind}:${b.amount}:${b.name}`)
  }

  it('lists a short all-in under five big blinds', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const short = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 40 } : p,
      ),
    }
    const shove: GameState = {
      ...short,
      players: short.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 0, isAllIn: true } : p,
      ),
      round: {
        ...short.round,
        lastSeatBettingAction: ['allIn', null],
        playerBets: { 'human:a': 40 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, short, shove)
    expect(handBetLines()).toEqual(['allIn:40:Alice C.'])
  })

  it('lists a call that takes the last chip as an all-in', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const callOff: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 0, isAllIn: true } : p,
      ),
      round: {
        ...before.round,
        lastSeatBettingAction: ['call', null],
        playerBets: { 'human:a': 1000 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, callOff)
    expect(handBetLines()).toEqual(['allIn:1000:Alice C.'])
  })

  it('lists an all-in after the street action was cleared', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const covered: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:a' ? { ...p, bankroll: 0, isAllIn: true } : p,
      ),
      round: {
        ...before.round,
        bettingRound: 2,
        currentBet: 0,
        playerBets: {},
        lastSeatBettingAction: [null, null],
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, covered)
    expect(handBetLines()).toEqual(['allIn:1000:Alice C.'])
  })

  it('keeps a first-street big bet while the second street is a run of small calls', () => {
    clearVenueHostLog('LOG')
    const before = baseTable()
    const raised: GameState = {
      ...before,
      players: before.players.map((p) =>
        p.id === 'human:b' ? { ...p, bankroll: 500 } : p,
      ),
      round: {
        ...before.round,
        roundId: 'r1',
        currentBet: 500,
        lastSeatBettingAction: [null, 'raise'],
        playerBets: { 'human:b': 500 },
      },
    }
    recordVenueMovesBetweenStates('LOG', 1, before, raised)

    let prev = raised
    for (let i = 0; i < 50; i++) {
      const bankroll = 1000 - (i + 1) * 20
      const next: GameState = {
        ...prev,
        players: prev.players.map((p) =>
          p.id === 'human:a' ? { ...p, bankroll } : p,
        ),
        round: {
          ...prev.round,
          bettingRound: 2,
          currentBet: 20,
          lastSeatBettingAction: i % 2 === 0 ? ['call', 'raise'] : ['raise', 'raise'],
          playerBets: { 'human:a': (i + 1) * 20, 'human:b': 500 },
        },
      }
      recordVenueMovesBetweenStates('LOG', 1, prev, next)
      prev = next
    }

    expect(handBetLines()).toContain('raise:500:Bob D.')
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
  it('shows trivia points for a points-only chair instead of a zero stack', () => {
    const rows = buildHostVenueActionRows([
      {
        tableNum: 1,
        seated: 3,
        pot: 20,
        phase: 'question',
        seatNames: ['Maria A.', 'Jamal A.', 'Elena C.'],
        seatBankrolls: [960, 0, 0],
        seatPointsOnly: [false, true, true],
        seatAnswerPoints: [0, 185.59, 281.81],
        seatInvested: [0, 0, 0],
        unseatedNames: ['Opal A.'],
      } as never,
    ])
    const jamal = rows[0]?.seats.find((seat) => seat.name === 'Jamal A.')
    const elena = rows[0]?.seats.find((seat) => seat.name === 'Elena C.')
    const late = rows[0]?.seats.find((seat) => seat.name === 'Opal A.')
    expect(rows[0]?.pot).toBe(20)
    expect(rows[0]?.seats.find((seat) => seat.name === 'Maria A.')?.bankroll).toBe(960)
    expect(jamal?.answerPoints).toBe(185.59)
    expect(elena?.answerPoints).toBe(281.81)
    expect(jamal?.kind).toBe('points')
    expect(late?.offFelt).toBe(true)
  })

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

  it('keeps the side pot on the host row', () => {
    const rows = buildHostVenueActionRows([
      {
        tableNum: 1,
        seated: 2,
        pot: 850,
        sidePot: 300,
        phase: 'betting',
        seatNames: ['Ada', 'Bo'],
      } as never,
    ])
    expect(rows[0]?.pot).toBe(850)
    expect(rows[0]?.sidePot).toBe(300)
  })

  it('restarts the listed-player clock when a different player is on the action', () => {
    clearVenueHostLog('CLK')
    const brief = buildHostVenueFloorBrief({
      venueCode: 'CLK',
      tiles: [],
      fieldPlayerCount: 0,
      liveTableCount: 1,
      bigBlindHint: 20,
      handStartedAtMs: 1_000,
    })
    const log = { actingClockByTable: {} } as never
    expect(actingClockSince(log, 1, 'Ada', 1_000, 5_000)).toBe(5_000)
    expect(actingClockSince(log, 1, 'Ada', 1_000, 9_000)).toBe(5_000)
    expect(actingClockSince(log, 1, 'Bo', 1_000, 9_000)).toBe(9_000)
    expect(brief.actionRows).toEqual([])
  })

  it('keeps a player on the trivia field after the seat is gone', () => {
    clearVenueHostLog('TRIV')
    const seated = {
      players: [
        { id: 'a', name: 'Ada', answerPoints: 12 },
        { id: 'b', name: 'Bea', answerPoints: 4 },
      ],
    }
    expect(rememberVenueTriviaField('TRIV', [seated]).map((row) => row.name).sort()).toEqual(['Ada', 'Bea'])
    const field = rememberVenueTriviaField('TRIV', [{ players: [seated.players[1]!], pointsStandings: [] }])
    expect(field.map((row) => row.name).sort()).toEqual(['Ada', 'Bea'])
    expect(field.find((row) => row.name === 'Ada')?.answerPoints).toBe(12)
  })

  it('records when a table has no more bets', () => {
    const rows = buildHostVenueActionRows([
      { tableNum: 1, seated: 2, pot: 40, phase: 'betting', seatNames: ['Bo'], isBettingOpen: true } as never,
      { tableNum: 2, seated: 2, pot: 40, phase: 'betting', seatNames: ['Ada'], isBettingOpen: false } as never,
      {
        tableNum: 3,
        seated: 2,
        pot: 40,
        phase: 'betting',
        seatNames: ['Cy'],
        isBettingOpen: null,
        currentPlayerIndex: -1,
      } as never,
      { tableNum: 4, seated: 2, pot: 0, phase: 'answering', seatNames: ['Dee'] } as never,
    ])
    expect(rows.map((row) => row.betsClosed)).toEqual([false, true, true, false])
  })

  it('counts guesses locked in while a table is answering', () => {
    const rows = buildHostVenueActionRows([
      {
        tableNum: 1,
        seated: 3,
        pot: 0,
        phase: 'answering',
        seatNames: ['Ada', '', 'Bo', 'Cy'],
        seatAnswerLocked: [true, false, false, true],
      } as never,
      {
        tableNum: 2,
        seated: 1,
        pot: 0,
        phase: 'betting',
        seatNames: ['Dee'],
        seatAnswerLocked: [true],
      } as never,
    ])
    expect(rows[0]?.answersSubmitted).toBe(2)
    expect(rows[0]?.answersExpected).toBe(3)
    expect(rows[0]?.seats.map((seat) => `${seat.name}:${seat.guessLocked === true}`)).toEqual([
      'Ada:true',
      'Bo:false',
      'Cy:true',
    ])
    expect(rows[1]?.answersSubmitted).toBeUndefined()
    expect(rows[1]?.answersExpected).toBeUndefined()
  })

  it('lists a player past the eight chairs without counting them in the guess total', () => {
    const rows = buildHostVenueActionRows([
      {
        tableNum: 3,
        seated: 9,
        pot: 0,
        phase: 'answering',
        seatNames: ['Ada', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal'],
        seatAnswerLocked: [true, true, true, true, true, true, true, true],
        unseatedNames: ['Ivy'],
      } as never,
    ])
    expect(rows[0]?.answersSubmitted).toBe(8)
    expect(rows[0]?.answersExpected).toBe(8)
    expect(rows[0]?.seats.some((seat) => seat.name === 'Ivy' && seat.offFelt === true)).toBe(true)
    expect(rows[0]?.pointsOnlyCount).toBe(0)
  })

  it('records whether a player past the felt still owes a guess', () => {
    const rows = buildHostVenueActionRows([
      {
        tableNum: 3,
        seated: 10,
        pot: 0,
        phase: 'answering',
        seatNames: ['Ada', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal'],
        seatAnswerLocked: [true, true, true, true, true, true, true, true],
        unseatedNames: ['Ivy', 'Opal'],
        unseatedGuessLocked: [false, true],
      } as never,
    ])
    expect(rows[0]?.answersSubmitted).toBe(8)
    expect(rows[0]?.answersExpected).toBe(8)
    expect(rows[0]?.pointsOnlyCount).toBe(0)
    expect(rows[0]?.seats.find((seat) => seat.name === 'Ivy')).toMatchObject({
      offFelt: true,
      kind: 'points',
      guessLocked: false,
    })
    expect(rows[0]?.seats.find((seat) => seat.name === 'Opal')).toMatchObject({
      offFelt: true,
      guessLocked: true,
    })
  })

  it('keeps tables in numerical order when one is interesting', () => {
    const rows = buildHostVenueActionRows([
      { tableNum: 4, seated: 2, pot: 0, phase: 'betting', seatNames: ['Ned'], interestingAction: true } as never,
      { tableNum: 1, seated: 2, pot: 0, phase: 'betting', seatNames: ['Ada'] } as never,
    ])
    expect(rows.map((row) => row.tableNum)).toEqual([1, 4])
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
