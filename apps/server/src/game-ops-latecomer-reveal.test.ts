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

/** Two chip players dealt in, one of whom may not have guessed yet, plus Cara for points. */
function answeringTable(
  venue: string,
  opts: { bobGuessed: boolean; bobFolded?: boolean; caraHand?: ReturnType<typeof cards>; caraGuess?: number },
): void {
  let gs = createEmptyGame(venue, 'host', '1')
  gs = addPlayer(gs, 'ada', 'Ada')
  gs = addPlayer(gs, 'bob', 'Bob')
  gs = addPlayer(gs, 'cara', 'Cara', 0)
  const players = gs.players.map((p) => {
    if (p.id === 'ada') return { ...p, hand: cards(1, 2), submittedAnswer: 12345 }
    if (p.id === 'bob') {
      return {
        ...p,
        hand: cards(3, 4),
        hasFolded: opts.bobFolded === true,
        ...(opts.bobGuessed ? { submittedAnswer: 34567 } : {}),
      }
    }
    return {
      ...p,
      hand: opts.caraHand ?? [],
      pointsOnly: true,
      ghostHostId: 'ada',
      ...(opts.caraGuess != null ? { submittedAnswer: opts.caraGuess } : {}),
    }
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

  it('reveals when the chip players have guessed and a points-only player with cards has not', () => {
    answeringTable('LR3', { bobGuessed: true, caraHand: cards(5, 6) })
    const { socket, toasts } = host()
    expect(revealVenueAnswersTogether(socket, 'lr3')).toBe(true)
    const cara = rooms.get(tableSessionKey('LR3', '1'))!.players.find((player) => player.id === 'cara')
    expect(rooms.get(tableSessionKey('LR3', '1'))!.phase).toBe('reveal')
    expect(cara?.answerForfeited).toBe(true)
    expect(cara?.submittedAnswer).toBeUndefined()
    expect(toasts).toEqual([])
  })

  it('keeps a points-only guess that was locked before reveal', () => {
    answeringTable('LR4', { bobGuessed: true, caraHand: cards(5, 6), caraGuess: 55667 })
    const { socket } = host()
    expect(revealVenueAnswersTogether(socket, 'lr4')).toBe(true)
    const cara = rooms.get(tableSessionKey('LR4', '1'))!.players.find((player) => player.id === 'cara')
    expect(cara?.submittedAnswer).toBe(55667)
    expect(cara?.answerForfeited).not.toBe(true)
  })

  it('still waits for a folded chip player who has not guessed', () => {
    answeringTable('LR5', { bobGuessed: false, bobFolded: true })
    const { socket, toasts } = host()
    expect(revealVenueAnswersTogether(socket, 'lr5')).toBe(false)
    expect(rooms.get(tableSessionKey('LR5', '1'))!.phase).toBe('answering')
    expect(toasts[0]).toContain('still guessing')
  })
})
