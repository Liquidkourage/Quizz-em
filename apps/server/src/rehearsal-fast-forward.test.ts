import { describe, expect, it } from 'vitest'
import { createEmptyGame, SAMPLE_QUESTIONS } from '@qhe/core'
import { addVirtualPlayers } from './virtual-players'
import { fastForwardTableToShowdown } from './rehearsal-fast-forward'

describe('rehearsal fast-forward', () => {
  it('advances a CPU-only lobby table to showdown', () => {
    let gs = createEmptyGame('V', 'host', '1')
    gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    gs = addVirtualPlayers(gs, 6)
    expect(gs.phase).toBe('lobby')

    const after = fastForwardTableToShowdown(gs, SAMPLE_QUESTIONS[0]!)
    expect(after.phase).toBe('showdown')
    expect(after.round.question).not.toBeNull()
    expect(after.round.communityCards.length).toBe(5)
    expect(after.players.some((p) => p.submittedAnswer !== undefined)).toBe(true)
  })
})
