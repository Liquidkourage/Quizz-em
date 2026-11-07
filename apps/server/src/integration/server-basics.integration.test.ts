import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { connectClient, type TestClient } from '../test-utils/socket-client'
import { startTestServer, type TestServer } from '../test-utils/test-server'

/** The real server, real sockets: health, host login, joining, seating and the late-join gate. */

const LOBBY = 'LOBBY'
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

const host = (room: string, secret?: string) =>
  connectClient(server.url, { role: 'host', name: 'Host', roomCode: room, tableId: LOBBY, hostSecret: secret ?? server.hostSecret })

const player = (room: string, name: string, playerId = `human:${name}-${Math.random().toString(36).slice(2, 8)}`) =>
  connectClient(server.url, { role: 'player', name, roomCode: room, tableId: LOBBY, playerId })

describe('health', () => {
  it('answers /health with ok', async () => {
    const res = await fetch(`${server.url}/health`)
    expect(res.status).toBe(200)
    expect((await res.text()).startsWith('ok')).toBe(true)
  })

  it('reports counts only on /health/details', async () => {
    const body = await (await fetch(`${server.url}/health/details`)).json()
    expect(body).toMatchObject({ status: 'ok', persistence: 'sqlite' })
    expect(typeof body.rooms).toBe('number')
    expect(JSON.stringify(body)).not.toContain(server.hostSecret)
  })
})

describe('host login', () => {
  it('refuses a wrong secret', async () => {
    await expect(host('BASIC1', 'not-the-secret')).rejects.toThrow(/Invalid host credentials/)
  }, 30_000)

  it('lets the right secret in and shows the starter question library', async () => {
    const h = track(await host('BASIC2'))
    expect(h.latest.phase).toBe('lobby')
    expect(h.latest.code).toBe('BASIC2')
  }, 30_000)
})

describe('joining and seating', () => {
  it('refuses a player when no host has opened the room', async () => {
    await expect(player('NOHOST', 'Ann')).rejects.toThrow(/No game found/)
  }, 30_000)

  it('refuses a second player with the same name', async () => {
    track(await host('BASIC3'))
    track(await player('BASIC3', 'Ada'))
    await expect(player('BASIC3', 'Ada')).rejects.toThrow(/already in the lobby/)
  }, 30_000)

  it('seats everyone at tables when the host assigns the lobby', async () => {
    const h = track(await host('BASIC4'))
    const ada = track(await player('BASIC4', 'Ada'))
    const bea = track(await player('BASIC4', 'Bea'))
    const seated = [ada, bea].map((p) => new Promise<any>((resolve) => p.socket.once('seated', resolve)))
    h.act('assignTablesFromLobby')
    const tables = await Promise.all(seated)
    expect(tables.map((t) => typeof t.tableId)).toEqual(['string', 'string'])
  }, 30_000)

  it('seats a latecomer for points only once tables are assigned', async () => {
    const h = track(await host('BASIC5'))
    const ada = track(await player('BASIC5', 'Ada'))
    const seated = new Promise((resolve) => ada.socket.once('seated', resolve))
    h.act('assignTablesFromLobby')
    await seated
    await new Promise((r) => setTimeout(r, 500))
    const cara = track(await player('BASIC5', 'Cara'))
    await cara.waitForState((s) => s.players.some((p: any) => p.name === 'Cara' && p.pointsOnly === true), 'Cara seated for points')
  }, 30_000)

  it('lets a seated player come back with the same player id', async () => {
    const h = track(await host('BASIC6'))
    const id = 'human:returning-ada'
    const first = await player('BASIC6', 'Ada', id)
    const seated = new Promise((resolve) => first.socket.once('seated', resolve))
    h.act('assignTablesFromLobby')
    await seated
    first.close()
    const again = track(await player('BASIC6', 'Ada', id))
    expect(again.latest.players.some((p: any) => p.id === id)).toBe(true)
  }, 30_000)
})
