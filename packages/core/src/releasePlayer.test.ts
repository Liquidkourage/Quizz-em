import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, releasePlayer } from './index'

describe('releasePlayer', () => {
  it('drops a waiting player and leaves the others seated', () => {
    let gs = createEmptyGame('Q', 'host', 'LOBBY')
    gs = addPlayer(gs, 'human:a', 'Ada')
    gs = addPlayer(gs, 'human:b', 'Bea')
    const next = releasePlayer(gs, 'human:a')
    expect(next.players.map((p) => p.id)).toEqual(['human:b'])
    expect(next.round.dealerIndex).toBe(0)
  })

  it('folds an open bettor, then takes the seat, and keeps the pot', () => {
    let gs = createEmptyGame('Q', 'host', '1')
    gs = addPlayer(gs, 'human:a', 'Ada', 1000)
    gs = addPlayer(gs, 'human:b', 'Bea', 1000)
    gs = {
      ...gs,
      phase: 'betting',
      round: {
        ...gs.round,
        pot: 40,
        isBettingOpen: true,
        currentBet: 20,
        currentPlayerIndex: 0,
        bettingRound: 1,
        playerBets: { 'human:a': 20, 'human:b': 20 },
        handContributions: { 'human:a': 20, 'human:b': 20 },
        lastSeatBettingAction: [null, null],
      },
    }
    const next = releasePlayer(gs, 'human:a')
    expect(next.players.map((p) => p.name)).toEqual(['Bea'])
    expect(next.round.pot).toBe(40)
    expect(next.round.handContributions?.['human:a']).toBe(20)
    expect(next.round.lastSeatBettingAction).toHaveLength(1)
    expect(next.players[0]?.hasFolded).toBe(false)
  })
})
