import { createEmptyGame } from '@qhe/core'
import type { Socket } from 'socket.io'
import { afterEach, describe, expect, it } from 'vitest'
import { clearPlayerSocketRegistry, registerPlayerSocket } from './player-socket-registry'
import { denyUnlessOwnSeat, foldIsLegalNow } from './own-seat'

afterEach(() => {
  clearPlayerSocketRegistry()
})

function stubSocket(id: string) {
  const events: { event: string; payload: unknown }[] = []
  const socket = {
    id,
    emit(event: string, payload: unknown) {
      events.push({ event, payload })
    },
  } as unknown as Socket
  return { socket, events }
}

describe('denyUnlessOwnSeat', () => {
  it('allows the socket that joined as that player', () => {
    registerPlayerSocket('human:ada', 'sock-a')
    const { socket, events } = stubSocket('sock-a')
    expect(denyUnlessOwnSeat(socket, 'human:ada')).toBe(false)
    expect(events).toEqual([])
  })

  it('refuses another seat, a missing id, and an unregistered socket', () => {
    registerPlayerSocket('human:ada', 'sock-a')
    const bea = stubSocket('sock-b')
    expect(denyUnlessOwnSeat(bea.socket, 'human:ada')).toBe(true)
    expect(bea.events.map((e) => e.event)).toEqual(['toast', 'ack'])
    const ada = stubSocket('sock-a')
    expect(denyUnlessOwnSeat(ada.socket, 'human:bea')).toBe(true)
    expect(denyUnlessOwnSeat(ada.socket, '')).toBe(true)
  })
})

describe('foldIsLegalNow', () => {
  it('allows a fold only for the seat to act during open wagering', () => {
    const gs = createEmptyGame('ROOM', 'host', '1')
    gs.phase = 'betting'
    gs.round.isBettingOpen = true
    gs.round.currentPlayerIndex = 1
    gs.players = [
      { id: 'human:ada', name: 'Ada', bankroll: 1000, hand: [], hasFolded: false, isAllIn: false },
      { id: 'human:bea', name: 'Bea', bankroll: 1000, hand: [], hasFolded: false, isAllIn: false },
    ]
    expect(foldIsLegalNow(gs, 'human:bea')).toBe(true)
    expect(foldIsLegalNow(gs, 'human:ada')).toBe(false)
    gs.round.isBettingOpen = false
    expect(foldIsLegalNow(gs, 'human:bea')).toBe(false)
  })
})
