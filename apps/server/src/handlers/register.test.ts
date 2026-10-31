import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server, Socket } from 'socket.io'

vi.mock('./hello', () => ({ handleHello: vi.fn() }))
vi.mock('./dispatch-action', () => ({ dispatchAction: vi.fn() }))
vi.mock('./disconnect', () => ({ handleDisconnect: vi.fn() }))

import { handleDisconnect } from './disconnect'
import { dispatchAction } from './dispatch-action'
import { handleHello } from './hello'
import { registerGameSockets } from './register'

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function connectFakeSocket() {
  const handlers = new Map<string, (...args: unknown[]) => void>()
  const socket = {
    id: 'sock-1',
    emit: vi.fn(),
    on: (event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler)
    },
  }
  let onConnection: ((s: Socket) => void) | undefined
  const io = {
    on: (event: string, handler: (s: Socket) => void) => {
      if (event === 'connection') onConnection = handler
    },
  }
  registerGameSockets(io as unknown as Server)
  onConnection!(socket as unknown as Socket)
  return { socket, handlers }
}

describe('registerGameSockets', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('hands hello and action messages to their handlers', () => {
    const { socket, handlers } = connectFakeSocket()
    handlers.get('hello')!({ role: 'player' })
    handlers.get('action')!({ type: 'ping' })
    expect(handleHello).toHaveBeenCalledWith(socket, { role: 'player' })
    expect(dispatchAction).toHaveBeenCalledWith(socket, { type: 'ping' })
  })

  it('tells the client and keeps running when a hello handler rejects', async () => {
    vi.mocked(handleHello).mockRejectedValueOnce(new Error('bad hello'))
    const { socket, handlers } = connectFakeSocket()
    expect(() => handlers.get('hello')!({})).not.toThrow()
    await flush()
    expect(socket.emit).toHaveBeenCalledWith('toast', expect.stringMatching(/went wrong/i))
  })

  it('tells the client and keeps running when an action handler throws', async () => {
    vi.mocked(dispatchAction).mockImplementationOnce(() => {
      throw new Error('bad action')
    })
    const { socket, handlers } = connectFakeSocket()
    expect(() => handlers.get('action')!({ type: 'x' })).not.toThrow()
    await flush()
    expect(socket.emit).toHaveBeenCalledWith('toast', expect.stringMatching(/went wrong/i))
  })

  it('does not throw when disconnect cleanup fails', () => {
    vi.mocked(handleDisconnect).mockImplementationOnce(() => {
      throw new Error('bad cleanup')
    })
    const { handlers } = connectFakeSocket()
    expect(() => handlers.get('disconnect')!()).not.toThrow()
  })
})
