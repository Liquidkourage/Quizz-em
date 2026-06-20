import { describe, expect, it } from 'vitest'
import { createEmptyGame, dealCommunityCards, dealInitialCards, setQuestion, startGame, SAMPLE_QUESTIONS } from '@qhe/core'
import { addVirtualPlayers, runVirtualPlayerSimulation } from './virtual-players'
import {
  isPostBoardWageringClosed,
  openAnsweringPhase,
  planVenueWageringOrchestration,
  VENUE_POST_BOARD_SHOWDOWN_GRACE_MS,
  venueAllPostBoardWageringComplete,
  venueAllPreBoardWageringComplete,
} from './venue-wagering-orchestration'

function allInRunoutPostBoardTable(): { key: string; gs: ReturnType<typeof createEmptyGame> } {
  const closed = postBoardClosedTable()
  const gs = {
    ...closed.gs,
    players: closed.gs.players.map((p) => ({
      ...p,
      bankroll: 0,
      isAllIn: !p.hasFolded,
    })),
  }
  expect(isPostBoardWageringClosed(gs)).toBe(true)
  return { key: closed.key, gs }
}

function postBoardClosedTable(playerCount = 4): { key: string; gs: ReturnType<typeof createEmptyGame> } {
  let gs = createEmptyGame('V', '', '1')
  gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
  gs = addVirtualPlayers(gs, playerCount)
  gs = startGame(gs)
  gs = setQuestion(gs, SAMPLE_QUESTIONS[0]!)
  gs = dealInitialCards(gs)
  gs = runVirtualPlayerSimulation(gs)
  gs = dealCommunityCards(gs)
  gs = runVirtualPlayerSimulation(gs)
  expect(isPostBoardWageringClosed(gs)).toBe(true)
  return { key: 'V:1', gs }
}

function preBoardClosedTable(playerCount = 4): { key: string; gs: ReturnType<typeof createEmptyGame> } {
  let gs = createEmptyGame('V', '', '1')
  gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
  gs = addVirtualPlayers(gs, playerCount)
  gs = startGame(gs)
  gs = setQuestion(gs, SAMPLE_QUESTIONS[0]!)
  gs = dealInitialCards(gs)
  gs = runVirtualPlayerSimulation(gs)
  expect(gs.round.bettingRound).toBe(1)
  expect(gs.round.isBettingOpen).toBe(false)
  return { key: 'V:1', gs }
}

describe('venue wagering orchestration', () => {
  it('requests community board when every seated table finished round 1', () => {
    const t1 = preBoardClosedTable()
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [t1.key],
      getState: (tk) => (tk === t1.key ? t1.gs : undefined),
      currentShowdownAtMs: undefined,
      nowMs: 500_000,
    })
    expect(plan.dealCommunityBoard).toBe(true)
    expect(venueAllPreBoardWageringComplete([t1.key], (tk) => (tk === t1.key ? t1.gs : undefined))).toBe(true)
  })

  it('does not deal the board while one table still has round 1 open', () => {
    const done = preBoardClosedTable()
    let open = createEmptyGame('V', '', '2')
    open = { ...open, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    open = addVirtualPlayers(open, 3)
    open = startGame(open)
    open = setQuestion(open, SAMPLE_QUESTIONS[0]!)
    open = dealInitialCards(open)
    expect(open.round.isBettingOpen).toBe(true)

    const states = new Map([
      [done.key, done.gs],
      ['V:2', open],
    ])
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [done.key, 'V:2'],
      getState: (tk) => states.get(tk),
      currentShowdownAtMs: undefined,
      nowMs: 600_000,
    })
    expect(plan.dealCommunityBoard).toBe(false)
    expect(venueAllPreBoardWageringComplete([done.key, 'V:2'], (tk) => states.get(tk))).toBe(false)
  })

  it('opens answering with the 45s venue deadline when only one table is seated', () => {
    const { key, gs } = postBoardClosedTable()
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [key],
      getState: (tk) => (tk === key ? gs : undefined),
      currentShowdownAtMs: undefined,
      nowMs: 1_000_000,
    })
    expect(plan.tableUpdates).toHaveLength(1)
    expect(plan.tableUpdates[0]!.gameState.phase).toBe('answering')
    expect(plan.tableUpdates[0]!.answerDeadlineMs).toBe(1_000_000 + VENUE_POST_BOARD_SHOWDOWN_GRACE_MS)
    expect(plan.scheduleShowdownAtMs).toBe(1_000_000 + VENUE_POST_BOARD_SHOWDOWN_GRACE_MS)
  })

  it('does not auto-open answering on an all-in runout — host starts the answer window', () => {
    const { key, gs } = allInRunoutPostBoardTable()
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [key],
      getState: (tk) => (tk === key ? gs : undefined),
      currentShowdownAtMs: undefined,
      nowMs: 1_500_000,
    })
    expect(plan.tableUpdates).toHaveLength(0)
    expect(plan.scheduleShowdownAtMs).toBeNull()
    expect(venueAllPostBoardWageringComplete([key], (tk) => (tk === key ? gs : undefined))).toBe(true)
  })

  it('pulls an all-in runout into answering when another table already advanced', () => {
    const runout = allInRunoutPostBoardTable()
    const peer = postBoardClosedTable()
    const peerAnswering = openAnsweringPhase(peer.gs, null)
    const states = new Map([
      [runout.key, runout.gs],
      ['V:2', peerAnswering],
    ])
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [runout.key, 'V:2'],
      getState: (tk) => states.get(tk),
      currentShowdownAtMs: undefined,
      nowMs: 1_600_000,
    })
    expect(plan.tableUpdates.some((u) => u.sessionKey === runout.key && u.gameState.phase === 'answering')).toBe(true)
    expect(plan.scheduleShowdownAtMs).toBeNull()
  })

  it('waits for the last table before arming the venue showdown timer', () => {
    const t1 = postBoardClosedTable()
    let t2 = createEmptyGame('V', '', '2')
    t2 = { ...t2, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    t2 = addVirtualPlayers(t2, 3)
    t2 = startGame(t2)
    t2 = setQuestion(t2, SAMPLE_QUESTIONS[0]!)
    t2 = dealInitialCards(t2)
    t2 = runVirtualPlayerSimulation(t2)
    t2 = dealCommunityCards(t2)
    expect(t2.round.isBettingOpen).toBe(true)

    const states = new Map([
      [t1.key, t1.gs],
      ['V:2', t2],
    ])
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [t1.key, 'V:2'],
      getState: (tk) => states.get(tk),
      currentShowdownAtMs: undefined,
      nowMs: 2_000_000,
    })
    expect(plan.tableUpdates.some((u) => u.sessionKey === t1.key)).toBe(true)
    expect(plan.tableUpdates.find((u) => u.sessionKey === t1.key)?.answerDeadlineMs).toBeNull()
    expect(plan.scheduleShowdownAtMs).toBeNull()
    expect(venueAllPostBoardWageringComplete(['V:1', 'V:2'], (tk) => states.get(tk))).toBe(false)

    t2 = runVirtualPlayerSimulation(t2)
    states.set('V:2', t2)
    const plan2 = planVenueWageringOrchestration({
      seatedTableKeys: [t1.key, 'V:2'],
      getState: (tk) => states.get(tk),
      currentShowdownAtMs: undefined,
      nowMs: 2_000_500,
    })
    expect(plan2.scheduleShowdownAtMs).toBe(2_000_500 + VENUE_POST_BOARD_SHOWDOWN_GRACE_MS)
    expect(venueAllPostBoardWageringComplete(['V:1', 'V:2'], (tk) => states.get(tk))).toBe(true)
  })

  it('does not arm the timer while one table still has the post-board clock open', () => {
    const t1 = postBoardClosedTable()
    let t2 = createEmptyGame('V', '', '2')
    t2 = { ...t2, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    t2 = addVirtualPlayers(t2, 3)
    t2 = startGame(t2)
    t2 = setQuestion(t2, SAMPLE_QUESTIONS[0]!)
    t2 = dealInitialCards(t2)
    t2 = runVirtualPlayerSimulation(t2)
    t2 = dealCommunityCards(t2)
    expect(t2.round.isBettingOpen).toBe(true)

    const states = new Map([
      [t1.key, openAnsweringPhase(t1.gs, null)],
      ['V:2', t2],
    ])
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [t1.key, 'V:2'],
      getState: (tk) => states.get(tk),
      currentShowdownAtMs: undefined,
      nowMs: 3_000_000,
    })
    expect(plan.scheduleShowdownAtMs).toBeNull()
    expect(plan.tableUpdates.every((u) => u.answerDeadlineMs == null)).toBe(true)
  })

  it('does not arm the timer while a seated table is still in round 1', () => {
    const done = postBoardClosedTable()
    let round1 = createEmptyGame('V', '', '2')
    round1 = { ...round1, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    round1 = addVirtualPlayers(round1, 3)
    round1 = startGame(round1)
    round1 = setQuestion(round1, SAMPLE_QUESTIONS[0]!)
    round1 = dealInitialCards(round1)
    round1 = runVirtualPlayerSimulation(round1)
    expect(round1.round.bettingRound).toBe(1)

    const states = new Map([
      [done.key, openAnsweringPhase(done.gs, null)],
      ['V:2', round1],
    ])
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [done.key, 'V:2'],
      getState: (tk) => states.get(tk),
      currentShowdownAtMs: undefined,
      nowMs: 4_000_000,
    })
    expect(plan.scheduleShowdownAtMs).toBeNull()
  })
})
