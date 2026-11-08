import type { Socket } from 'socket.io'
import { addPlayer, createEmptyGame, type NumericCard } from '@qhe/core'
import { afterEach, describe, expect, it } from 'vitest'
import { clearPlayerSocketRegistry, emitStateToSocket, registerPlayerSocket } from './game-ops'

afterEach(() => {
  clearPlayerSocketRegistry()
})

function dealt() {
  const gs = addPlayer(createEmptyGame('ROOM', 'host', '1'), 'ada', 'Ada', 990)
  return {
    ...gs,
    phase: 'betting' as const,
    players: gs.players.map((player) =>
      player.id === 'ada'
        ? { ...player, hand: [{ digit: 7 }, { digit: 2 }] as NumericCard[] }
        : player,
    ),
  }
}

function capture(data: Record<string, unknown>, id = 'sock-old') {
  const events: { event: string; data: { players?: { hand?: { digit: number }[] }[] } }[] = []
  const socket = {
    id,
    data,
    emit(event: string, payload: unknown) {
      events.push({ event, data: payload as (typeof events)[number]['data'] })
    },
  } as unknown as Socket
  emitStateToSocket(socket, dealt())
  return events.find((event) => event.event === 'state')?.data.players?.[0]?.hand ?? []
}

describe('emitStateToSocket hole cards', () => {
  it('gives the joined phone its cards after a newer socket takes the action seat', () => {
    registerPlayerSocket('ada', 'sock-new')
    expect(capture({ role: 'player', viewerPlayerId: 'ada' }).map((card) => card.digit)).toEqual([
      7, 2,
    ])
  })

  it('still gives cards to the socket that currently owns the seat', () => {
    registerPlayerSocket('ada', 'sock-live')
    expect(capture({ role: 'player' }, 'sock-live').map((card) => card.digit)).toEqual([7, 2])
  })

  it('withholds cards from a player socket that never joined as that seat', () => {
    expect(capture({ role: 'player' })).toEqual([])
  })
})
