import { describe, expect, it } from 'vitest'
import { createEmptyGame, dealCommunityCards, dealInitialCards } from '@qhe/core'
import { addVirtualPlayers, runVirtualPlayerSimulation } from './virtual-players'
import {
  isPostBoardWageringClosed,
  openAnsweringPhase,
  planVenueWageringOrchestration,
  VENUE_POST_BOARD_SHOWDOWN_GRACE_MS,
  venueAllPostBoardWageringComplete,
} from './venue-wagering-orchestration'

function postBoardClosedTable(playerCount = 4): { key: string; gs: ReturnType<typeof createEmptyGame> } {
  let gs = createEmptyGame('V', '', '1')
  gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
  gs = addVirtualPlayers(gs, playerCount)
  gs = dealInitialCards(gs)
  gs = runVirtualPlayerSimulation(gs)
  gs = dealCommunityCards(gs)
  gs = runVirtualPlayerSimulation(gs)
  expect(isPostBoardWageringClosed(gs)).toBe(true)
  return { key: 'V:1', gs }
}

describe('venue wagering orchestration', () => {
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

  it('waits for the last table before arming the venue showdown timer', () => {
    const t1 = postBoardClosedTable()
    let t2 = createEmptyGame('V', '', '2')
    t2 = { ...t2, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    t2 = addVirtualPlayers(t2, 3)
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
