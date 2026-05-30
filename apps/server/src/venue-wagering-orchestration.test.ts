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
  it('opens answering when post-board wagering closes on a table', () => {
    const { key, gs } = postBoardClosedTable()
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [key],
      getState: (tk) => (tk === key ? gs : undefined),
      currentShowdownAtMs: undefined,
      nowMs: 1_000_000,
    })
    expect(plan.tableUpdates).toHaveLength(1)
    expect(plan.tableUpdates[0]!.gameState.phase).toBe('answering')
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

  it('syncs answering deadlines when the venue timer is already armed', () => {
    const { key, gs } = postBoardClosedTable()
    const opened = openAnsweringPhase(gs, gs.round.answerDeadline ?? Date.now() + 999_999)
    const answering = { ...opened, phase: 'answering' as const, round: { ...opened.round, answerDeadline: 9_999_999 } }
    const showdownAt = 5_000_000
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [key],
      getState: (tk) => (tk === key ? answering : undefined),
      currentShowdownAtMs: showdownAt,
      nowMs: 4_900_000,
    })
    expect(plan.tableUpdates).toHaveLength(1)
    expect(plan.tableUpdates[0]!.answerDeadlineMs).toBe(showdownAt)
    expect(plan.scheduleShowdownAtMs).toBeNull()
  })
})
