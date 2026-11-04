import { describe, expect, it } from 'vitest'
import { PLAYER_ROOM_CLOSED_MESSAGE } from '@qhe/net'
import { releasePhonesOnHardReset } from './venue-hard-reset'

describe('releasePhonesOnHardReset', () => {
  it('tells a seated phone and its table that the room has closed', () => {
    const phones: string[] = []
    const rooms: string[] = []
    releasePhonesOnHardReset({
      playerIds: ['human:ada', 'vp:cpu'],
      sessionKeys: ['QUIZ:1', 'QUIZ:LOBBY'],
      playerVenueRoom: 'PLAYER:QUIZ',
      socketForPlayer: (id) =>
        id === 'human:ada'
          ? { emit: (_event, payload) => phones.push(payload.message) }
          : undefined,
      emitToRoom: (room, _event, payload) => rooms.push(`${room}:${payload.message}`),
    })
    expect(phones).toEqual([PLAYER_ROOM_CLOSED_MESSAGE])
    expect(rooms).toContain(`QUIZ:1:${PLAYER_ROOM_CLOSED_MESSAGE}`)
    expect(rooms).toContain(`QUIZ:LOBBY:${PLAYER_ROOM_CLOSED_MESSAGE}`)
    expect(rooms).toContain(`PLAYER:QUIZ:${PLAYER_ROOM_CLOSED_MESSAGE}`)
  })
})
