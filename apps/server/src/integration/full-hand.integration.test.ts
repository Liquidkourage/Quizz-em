import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isVenueHeld, restoreRoomsFromSnapshot, rooms } from '../game-ops'
import { toSnapshotRows } from '../room-snapshot'
import { connectClient, type TestClient } from '../test-utils/socket-client'
import { startTestServer, type TestServer } from '../test-utils/test-server'

/**
 * A whole hand through the real server, then a restart in the middle of a hand.
 * Money rule checked throughout: chips are only ever moved, never created or lost.
 */

const LOBBY = 'LOBBY'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let server: TestServer
const open: TestClient[] = []
const track = (c: TestClient) => (open.push(c), c)

beforeAll(async () => {
  server = await startTestServer()
}, 30_000)

afterAll(async () => {
  for (const c of open) c.close()
  await server.close()
})

type Table = { host: TestClient; players: TestClient[]; ids: string[]; room: string }

async function seatedTable(room: string): Promise<Table> {
  const host = track(await connectClient(server.url, { role: 'host', name: 'Host', roomCode: room, tableId: LOBBY, hostSecret: server.hostSecret }))
  const ids = [`human:${room}-ada`, `human:${room}-bea`]
  const players: TestClient[] = []
  for (const [i, name] of ['Ada', 'Bea'].entries()) {
    players.push(track(await connectClient(server.url, { role: 'player', name, roomCode: room, tableId: LOBBY, playerId: ids[i] })))
  }
  const seated = players.map((p) => new Promise((resolve) => p.socket.once('seated', resolve)))
  host.act('assignTablesFromLobby')
  await Promise.all(seated)
  return { host, players, ids, room }
}

const chips = (state: any) =>
  (state.players ?? []).reduce((sum: number, p: any) => sum + (p.bankroll ?? 0), 0) + (state.round?.pot ?? 0)

async function dealIntoBetting(t: Table): Promise<any> {
  t.host.act('setQuestion', {})
  await t.host.waitForState((s) => s.phase === 'question' && s.round?.question != null, 'question on the table', 20_000)
  t.host.act('startGame')
  return t.host.waitForState((s) => s.phase === 'betting' && s.round?.isBettingOpen === true, 'betting open', 20_000)
}

function actingClient(t: Table, state: any): { client: TestClient; actor: any; verb: 'call' | 'check' } {
  const actor = state.players[state.round.currentPlayerIndex]
  const client = t.players.find((p) => p.name === actor?.name)
  if (!actor || !client) throw new Error(`no client for the acting seat (${actor?.name ?? 'none'})`)
  const owed = (state.round.currentBet || 0) - ((state.round.playerBets || {})[actor.id] || 0)
  return { client, actor, verb: owed > 0 ? 'call' : 'check' }
}

/** Five digits from the player's own two cards and the board, which is always a buildable answer. */
function answerFor(client: TestClient, playerId: string): number {
  const me = client.latest.players.find((p: any) => p.id === playerId)
  const digits = [...(me.hand ?? []), ...(client.latest.round.communityCards ?? [])].map((c: any) => c.digit)
  return Number(digits.slice(0, 5).join(''))
}

/** From an open first betting round to a paid hand: one wager, the board, guesses, reveal, payout. */
async function playOutHand(t: Table, betting: any, startingChips: number): Promise<void> {
  // One real wager, then the host closes the round.
  const { client, actor, verb } = actingClient(t, betting)
  client.act(verb, { playerId: actor.id })
  await sleep(300)
  t.host.act('adminCloseBetting')
  await t.host.waitForState((s) => s.phase === 'betting' && s.round?.isBettingOpen === false, 'first round closed')

  t.host.act('dealCommunityCards')
  await t.host.waitForState((s) => (s.round?.communityCards?.length ?? 0) >= 5, 'five shared cards', 20_000)
  t.host.act('adminCloseBetting')
  await t.host.waitForState(
    (s) => s.phase === 'betting' && s.round?.isBettingOpen === false && s.round?.bettingRound === 2,
    'second round closed',
    20_000,
  )

  t.host.act('startAnswering', {})
  await t.host.waitForState((s) => s.phase === 'answering', 'guessing open')
  for (const [i, p] of t.players.entries()) {
    await p.waitForState((s) => s.phase === 'answering', 'player sees guessing open')
    p.act('submitAnswer', { playerId: t.ids[i], answer: answerFor(p, t.ids[i]!) })
  }
  await sleep(300)

  t.host.act('revealAnswer')
  await t.host.waitForState((s) => s.phase === 'reveal' || s.phase === 'showdown', 'answer revealed', 20_000)
  expect(chips(t.host.latest)).toBe(startingChips)

  // Paying winners is held while the answer stays on the screens, so ask again until it goes through.
  const deadline = Date.now() + 40_000
  const left = (s: any) => !['reveal', 'showdown', 'answering', 'betting'].includes(s.phase)
  while (!left(t.host.latest) && Date.now() < deadline) {
    t.host.act('endRound')
    await sleep(1_500)
  }
  await t.host.waitForState(left, 'hand finished', 5_000)
}

describe('a whole hand', () => {
  it('goes from seating to payout, and no chips appear or vanish', async () => {
    const t = await seatedTable('HAND1')
    const startingChips = chips(t.host.latest)
    expect(startingChips).toBeGreaterThan(0)

    const betting = await dealIntoBetting(t)
    expect(chips(betting)).toBe(startingChips)

    await playOutHand(t, betting, startingChips)
    await sleep(500)
    expect(chips(t.host.latest)).toBe(startingChips)
  }, 120_000)
})


describe('a latecomer during a hand', () => {
  it('joins for points only, and the hand still pays out with chips conserved', async () => {
    const t = await seatedTable('LATE1')
    const startingChips = chips(t.host.latest)
    const betting = await dealIntoBetting(t)

    const lateId = 'human:LATE1-cara'
    const cara = track(await connectClient(server.url, { role: 'player', name: 'Cara', roomCode: t.room, tableId: LOBBY, playerId: lateId }))
    await cara.waitForState((s) => s.players.some((p: any) => p.id === lateId && p.pointsOnly === true), 'Cara seated for points')

    const seat = [...rooms.entries()]
      .filter(([key]) => key.startsWith('LATE1:'))
      .flatMap(([, gs]) => gs.players)
      .find((p) => p.id === lateId)!
    expect(seat.bankroll).toBe(0)
    expect(seat.ghostHostId).toBeTruthy()
    expect(chips(t.host.latest)).toBe(startingChips)

    // Cara holds no cards this hand, so the host must be able to reveal without her guess.
    await playOutHand(t, betting, startingChips)
    expect(chips(t.host.latest)).toBe(startingChips)
    const after = [...rooms.entries()]
      .filter(([key]) => key.startsWith('LATE1:'))
      .flatMap(([, gs]) => gs.players)
      .find((p) => p.id === lateId)!
    expect(after.bankroll).toBe(0)
  }, 120_000)
})

describe('a restart in the middle of a hand', () => {
  it('brings back seats, chips and phase, and the hand carries on', async () => {
    const t = await seatedTable('RESTART1')
    const betting = await dealIntoBetting(t)
    const before = {
      phase: betting.phase,
      pot: betting.round.pot,
      bankrolls: Object.fromEntries(betting.players.map((p: any) => [p.id, p.bankroll])),
    }
    await sleep(300)

    // What the saver would have written, then everything on the server forgets the room.
    const rows = toSnapshotRows(rooms).filter((r) => r.sessionKey.startsWith('RESTART1:'))
    expect(rows.length).toBeGreaterThan(0)
    for (const c of [...t.players, t.host]) c.close()
    await sleep(600)
    for (const key of [...rooms.keys()]) if (key.startsWith('RESTART1:')) rooms.delete(key)
    expect([...rooms.keys()].some((k) => k.startsWith('RESTART1:'))).toBe(false)

    const restored = restoreRoomsFromSnapshot(
      rows.map((r) => ({ ...r, savedAtMs: Date.now() - 5_000 })),
    )
    expect(restored.venues).toEqual(['RESTART1'])
    expect(isVenueHeld('RESTART1')).toBe(true)

    // Phones come back first, as they would; then the host.
    const back = [] as TestClient[]
    for (const [i, name] of ['Ada', 'Bea'].entries()) {
      back.push(track(await connectClient(server.url, { role: 'player', name, roomCode: 'RESTART1', tableId: LOBBY, playerId: t.ids[i] })))
    }
    expect(isVenueHeld('RESTART1')).toBe(true)
    const host = track(await connectClient(server.url, { role: 'host', name: 'Host', roomCode: 'RESTART1', tableId: LOBBY, hostSecret: server.hostSecret }))
    expect(isVenueHeld('RESTART1')).toBe(false)

    const after = await host.waitForState((s) => s.phase === 'betting', 'betting state back after the restart', 20_000)
    expect(after.phase).toBe(before.phase)
    expect(after.round.pot).toBe(before.pot)
    expect(Object.fromEntries(after.players.map((p: any) => [p.id, p.bankroll]))).toEqual(before.bankrolls)

    // And the hand still plays: the acting player can act.
    const table: Table = { host, players: back, ids: t.ids, room: 'RESTART1' }
    const { client, actor, verb } = actingClient(table, after)
    const moved = host.waitForState(
      (s) => s.round?.currentPlayerIndex !== after.round.currentPlayerIndex || s.round?.isBettingOpen === false,
      'play continues after the restart',
    )
    client.act(verb, { playerId: actor.id })
    await moved
  }, 90_000)
})
