import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Socket } from 'socket.io'
import { revealVenueAnswersTogether, rooms, tableSessionKey } from './game-ops'

/**
 * A latecomer who joined mid-hand is seated for points with no hole cards, so they cannot build a
 * guess this hand. The host's Reveal must not wait for them.
 */

const cards = (a: number, b: number) => [{ digit: a }, { digit: b }] as never

function host() {
  const toasts: string[] = []
  const socket = { emit: (event: string, msg: string) => void (event === 'toast' && toasts.push(msg)) } as unknown as Socket
  return { socket, toasts }
}

/** Two chip players dealt in, one of whom may not have guessed yet, plus a latecomer with no cards. */
function answeringTable(venue: string, opts: { bobGuessed: boolean }): void {
  let gs = createEmptyGame(venue, 'host', '1')
  gs = addPlayer(gs, 'ada', 'Ada')
  gs = addPlayer(gs, 'bob', 'Bob')
  gs = addPlayer(gs, 'cara', 'Cara', 0)
  const players = gs.players.map((p) => {
    if (p.id === 'ada') return { ...p, hand: cards(1, 2), submittedAnswer: 12345 }
    if (p.id === 'bob') return { ...p, hand: cards(3, 4), ...(opts.bobGuessed ? { submittedAnswer: 34567 } : {}) }
    return { ...p, hand: [], pointsOnly: true, ghostHostId: 'ada' }
  })
  rooms.set(tableSessionKey(venue, '1'), {
    ...gs,
    phase: 'answering',
    players,
    round: { ...gs.round, answerDeadline: Date.now() + 60_000 },
  } as unknown as GameState)
}

beforeEach(() => {
  rooms.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('revealVenueAnswersTogether with a card-less latecomer', () => {
  it('reveals as soon as everyone who can guess has guessed, before the clock runs out', () => {
    answeringTable('LR1', { bobGuessed: true })
    const { socket, toasts } = host()
    expect(revealVenueAnswersTogether(socket, 'lr1')).toBe(true)
    expect(rooms.get(tableSessionKey('LR1', '1'))!.phase).toBe('reveal')
    expect(toasts).toEqual([])
  })

  it('still waits for a dealt-in player who has not guessed', () => {
    answeringTable('LR2', { bobGuessed: false })
    const { socket, toasts } = host()
    expect(revealVenueAnswersTogether(socket, 'lr2')).toBe(false)
    expect(rooms.get(tableSessionKey('LR2', '1'))!.phase).toBe('answering')
    expect(toasts[0]).toContain('still guessing')
  })
})
