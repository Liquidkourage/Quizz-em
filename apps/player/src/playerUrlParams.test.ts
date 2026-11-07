import { describe, expect, it } from 'vitest'
import { PLAYER_NEW_GAME_MESSAGE, PLAYER_ROOM_CLOSED_MESSAGE } from '@qhe/net'
import { playerJoinBoot, playerLeaveScreen, playerSessionCanResume } from './playerUrlParams'

describe('playerSessionCanResume', () => {
  it('reconnects a phone that already joined', () => {
    expect(
      playerSessionCanResume({
        firstName: 'Ada',
        lastInitial: 'L',
        roomCode: 'HOST01',
        playerId: 'human:ada',
      }),
    ).toBe(true)
  })

  it('lets go of a phone after the room has closed', () => {
    expect(
      playerSessionCanResume({
        firstName: 'Ada',
        lastInitial: 'L',
        roomCode: 'HOST01',
        playerId: 'human:ada',
        roomClosed: true,
      }),
    ).toBe(false)
  })

  it('opens the join form after a reload when this phone had left', () => {
    const boot = playerJoinBoot({
      firstName: 'Ada',
      lastInitial: 'L',
      roomCode: 'HOST01',
      playerId: 'human:ada',
      autoSeat: true,
      tableId: 'LOBBY',
      departed: true,
      roomFromUrl: false,
      nameFromUrl: false,
    })
    expect(boot.prefs.departed).toBe(false)
    expect(boot.resume).toBe(false)
    expect(boot.prefs.firstName).toBe('Ada')
    expect(boot.prefs.roomCode).toBe('HOST01')
  })

  it('keeps a closed night on the closed screen after a reload', () => {
    const boot = playerJoinBoot({
      firstName: 'Ada',
      lastInitial: 'L',
      roomCode: 'HOST01',
      playerId: 'human:ada',
      autoSeat: true,
      tableId: 'LOBBY',
      roomClosed: true,
      roomFromUrl: false,
      nameFromUrl: false,
    })
    expect(boot.resume).toBe(false)
    expect(boot.prefs.roomClosed).toBe(true)
  })

  it('sends a new game back to the join form and a quit to the left screen', () => {
    expect(playerLeaveScreen(PLAYER_NEW_GAME_MESSAGE)).toBe('form')
    expect(playerLeaveScreen('You left the event.')).toBe('left')
    expect(playerLeaveScreen(PLAYER_ROOM_CLOSED_MESSAGE)).toBe('closed')
  })

  it('boots a saved phone straight back into the room', () => {
    const boot = playerJoinBoot({
      firstName: 'Ada',
      lastInitial: 'L',
      roomCode: 'HOST01',
      playerId: 'human:ada',
      autoSeat: true,
      tableId: '1',
      roomFromUrl: true,
      nameFromUrl: false,
    })
    expect(boot.resume).toBe(true)
    expect(boot.prefs.playerId).toBe('human:ada')
  })

  it('keeps a first visit on the name screen', () => {
    expect(
      playerSessionCanResume({
        firstName: '',
        lastInitial: '',
        roomCode: 'HOST01',
        playerId: 'human:new',
      }),
    ).toBe(false)
    expect(
      playerSessionCanResume({
        firstName: 'Ada',
        lastInitial: 'L',
        roomCode: '',
        playerId: 'human:ada',
      }),
    ).toBe(false)
  })
})
