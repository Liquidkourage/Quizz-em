import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, playerCheck } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  clearHumanTurnClock,
  cpuVpDrainPending,
  playVirtualPlayers,
  prepareVenuePersistence,
  rooms,
  tableSessionKey,
} from './game-ops'
import { rehearsalBetScript } from './virtual-players'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

/** Two bots who check when nothing is owed, so the pause is the only thing between them. */
function flatBotIds(): [string, string] {
  const ids: string[] = []
  for (let i = 0; i < 20_000 && ids.length < 2; i++) {
    const id = `vp:pace:${i}`
    if (rehearsalBetScript(id, 'r1', 1) === 'flat') ids.push(id)
  }
  if (ids.length < 2) throw new Error('flat')
  return [ids[0]!, ids[1]!]
}

beforeAll(async () => {
  await prepareVenuePersistence()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  rooms.clear()
  bindGameIo({
    to: () => ({ emit: () => undefined }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  } as unknown as Server)
})

afterEach(() => {
  for (const key of rooms.keys()) clearHumanTurnClock(key)
  cpuVpDrainPending.clear()
  vi.useRealTimers()
  delete process.env.QHE_CPU_VP_ACTION_DELAY_MS
})

describe('bot pace with a person at the table', () => {
  it('lets one bot act, then waits out the pause before the next', async () => {
    process.env.QHE_CPU_VP_ACTION_DELAY_MS = '5000'
    const [ada, bea] = flatBotIds()
    let gs = createEmptyGame('PACE', 'host', '1')
    gs = addPlayer(gs, 'human-ann', 'Ann')
    gs = addPlayer(gs, ada, 'Ada')
    gs = addPlayer(gs, bea, 'Bea')
    gs = {
      ...gs,
      phase: 'betting',
      round: {
        ...gs.round,
        roundId: 'r1',
        isBettingOpen: true,
        bettingRound: 1,
        currentBet: 0,
        currentPlayerIndex: 0,
        playerBets: {},
        pot: 0,
      },
    }
    const checked = playerCheck(gs, 'human-ann')
    const key = tableSessionKey('PACE', '1')
    const paced = playVirtualPlayers(key, checked)
    rooms.set(key, paced)

    expect(paced.round.currentPlayerIndex).toBe(1)
    expect(paced.round.isBettingOpen).toBe(true)

    await vi.advanceTimersByTimeAsync(0)
    expect(rooms.get(key)!.round.currentPlayerIndex).toBe(2)
    expect(rooms.get(key)!.round.isBettingOpen).toBe(true)

    await vi.advanceTimersByTimeAsync(4_999)
    expect(rooms.get(key)!.round.currentPlayerIndex).toBe(2)
    expect(rooms.get(key)!.round.isBettingOpen).toBe(true)

    await vi.advanceTimersByTimeAsync(1)
    expect(rooms.get(key)!.round.isBettingOpen).toBe(false)
  })
})
