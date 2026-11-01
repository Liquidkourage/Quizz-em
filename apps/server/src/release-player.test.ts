import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import { dropPlayerFromVenue, rooms, tableSessionKey } from './game-ops'

beforeEach(() => {
  rooms.clear()
})
afterEach(() => {
  rooms.clear()
})

describe('dropPlayerFromVenue', () => {
  it('removes a seated player and leaves the other table alone', () => {
    const venue = 'QUIT'
    let table1 = createEmptyGame(venue, 'host', '1')
    table1 = addPlayer(table1, 'human:a', 'Ada Lane')
    table1 = addPlayer(table1, 'human:b', 'Bea Cole')
    let table2 = createEmptyGame(venue, 'host', '2')
    table2 = addPlayer(table2, 'human:c', 'Cy Drew')
    rooms.set(tableSessionKey(venue, '1'), table1)
    rooms.set(tableSessionKey(venue, '2'), table2)

    const result = dropPlayerFromVenue(venue, 'human:a')
    expect(result.ok).toBe(true)
    expect(rooms.get(tableSessionKey(venue, '1'))!.players.map((p) => p.id)).toEqual(['human:b'])
    expect(rooms.get(tableSessionKey(venue, '2'))!.players.map((p) => p.id)).toEqual(['human:c'])
  })

  it('removes someone still waiting in the lobby', () => {
    const venue = 'QUIT'
    let lobby = createEmptyGame(venue, 'host', 'LOBBY')
    lobby = addPlayer(lobby, 'human:a', 'Ada Lane')
    rooms.set(tableSessionKey(venue, 'LOBBY'), lobby)
    const result = dropPlayerFromVenue(venue, 'human:a')
    expect(result.ok).toBe(true)
    expect(rooms.get(tableSessionKey(venue, 'LOBBY'))!.players).toEqual([])
  })
})
