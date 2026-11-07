import { io, type Socket } from 'socket.io-client'

/** A connected test client that remembers the latest state the server sent it. */
export interface TestClient {
  socket: Socket
  name: string
  latest: any
  toasts: string[]
  act(type: string, payload?: unknown): void
  waitForState(predicate: (state: any) => boolean, label: string, ms?: number): Promise<any>
  close(): void
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function connectClient(url: string, hello: Record<string, unknown>): Promise<TestClient> {
  const name = String(hello.name ?? hello.role)
  const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 10_000 })
  const client: TestClient = {
    socket,
    name,
    latest: null,
    toasts: [],
    act: (type, payload) => void socket.emit('action', { type, ...(payload != null ? { payload } : {}) }),
    waitForState: (predicate, label, ms = 15_000) =>
      new Promise((resolve, reject) => {
        if (client.latest && safe(predicate, client.latest)) return resolve(client.latest)
        const timer = setTimeout(() => {
          socket.off('state', on)
          reject(new Error(`${name}: timed out waiting for ${label}. Last state: ${summary(client.latest)}`))
        }, ms)
        const on = (state: unknown) => {
          if (!safe(predicate, state)) return
          clearTimeout(timer)
          socket.off('state', on)
          resolve(state)
        }
        socket.on('state', on)
      }),
    close: () => void socket.close(),
  }
  socket.on('state', (s) => (client.latest = s))
  socket.on('toast', (m) => client.toasts.push(String(m)))

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name}: hello timed out`)), 15_000)
    socket.on('connect_error', (e) => (clearTimeout(timer), reject(e)))
    socket.on('connect', () => {
      socket.once('ack', (ack) => {
        clearTimeout(timer)
        if (!ack?.ok) {
          socket.close()
          reject(new Error(`${name}: ${ack?.message ?? 'hello refused'}`))
        } else resolve()
      })
      socket.emit('hello', hello)
    })
  })
  // The first state follows the ack; give it a moment so `latest` is filled.
  for (let i = 0; i < 50 && client.latest == null; i++) await sleep(20)
  return client
}

function safe(predicate: (s: any) => boolean, state: unknown): boolean {
  try {
    return Boolean(predicate(state))
  } catch {
    return false
  }
}

function summary(state: any): string {
  if (!state) return 'none'
  return JSON.stringify({
    phase: state.phase,
    tableId: state.tableId,
    bettingRound: state.round?.bettingRound,
    isBettingOpen: state.round?.isBettingOpen,
    community: state.round?.communityCards?.length,
    players: state.players?.length,
  })
}

export function waitForEvent<T = any>(socket: Socket, event: string, predicate: (p: T) => boolean, label: string, ms = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => (socket.off(event, on), reject(new Error(`timed out waiting for ${label}`))), ms)
    const on = (payload: T) => {
      if (!safe(predicate as any, payload)) return
      clearTimeout(timer)
      socket.off(event, on)
      resolve(payload)
    }
    socket.on(event, on)
  })
}
