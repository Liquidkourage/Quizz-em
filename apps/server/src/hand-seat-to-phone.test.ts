import { afterEach, describe, expect, it } from 'vitest'
import type { Server } from 'socket.io'
import { addPlayer, createEmptyGame } from '@qhe/core'
import {
  bindGameIo,
  handSeatToPhone,
  rooms,
  tableSessionKey,
} from './game-ops'
import {
  clearPlayerSocketRegistry,
  initPlayerSocketRegistry,
  playerIdForSocket,
  registerPlayerSocket,
} from './player-socket-registry'

afterEach(() => {
  rooms.clear()
  clearPlayerSocketRegistry()
})

describe('handSeatToPhone', () => {
  it('gives a late points phone the selected chair and removes the placeholder', () => {
    const venue = 'PHONE'
    const key = tableSessionKey(venue, '1')
    const seated = addPlayer(createEmptyGame(venue, 'host', '1'), 'ada', 'Ada Lane', 1000)
    rooms.set(key, {
      ...seated,
      players: seated.players.concat({
        id: 'dee',
        name: 'Dee Moss',
        bankroll: 0,
        hand: [],
        hasFolded: false,
        isAllIn: false,
        answerPoints: 0,
        pointsOnly: true,
        ghostHostId: 'ada',
      }),
    })
    const sock = {
      connected: true,
      data: {} as { viewerPlayerId?: string; sessionKey?: string },
      join() {},
      leave() {},
      emit() {},
    }
    const io = {
      sockets: { adapter: { rooms: new Map() }, sockets: new Map([['dee-sock', sock]]) },
      to() {
        return { emit() {} }
      },
    }
    bindGameIo(io as unknown as Server)
    initPlayerSocketRegistry(io as unknown as Server)
    registerPlayerSocket('dee', 'dee-sock')

    const handed = handSeatToPhone(venue, 'ada', 'dee')

    expect(handed.ok).toBe(true)
    expect(rooms.get(key)?.players.map((player) => player.id)).toEqual(['ada'])
    expect(playerIdForSocket('dee-sock')).toBe('ada')
    expect(sock.data.viewerPlayerId).toBe('ada')
  })
})
