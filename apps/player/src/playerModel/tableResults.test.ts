import { describe, expect, it } from 'vitest'
import { createEmptyGame } from '@qhe/core'
import {
  buildTableResults,
  formatPotWin,
  formatWinnerLine,
  shouldClearTableResults,
} from './tableResults'

function showdownState(overrides?: {
  players?: Array<{
    id: string
    name: string
    submittedAnswer?: number
    hasFolded?: boolean
    pointsOnly?: boolean
    bankroll?: number
  }>
  pot?: number
  answer?: number
  phase?: 'reveal' | 'showdown' | 'payout'
}) {
  let gs = createEmptyGame('HOST01', 'host', '1')
  const players = (overrides?.players ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    bankroll: p.bankroll ?? 1000,
    hand: [] as { digit: number }[],
    hasFolded: p.hasFolded ?? false,
    isAllIn: false,
    ...(p.submittedAnswer !== undefined ? { submittedAnswer: p.submittedAnswer } : {}),
    ...(p.pointsOnly ? { pointsOnly: true } : {}),
  }))
  gs = {
    ...gs,
    phase: overrides?.phase ?? 'showdown',
    players,
    round: {
      ...gs.round,
      pot: overrides?.pot ?? 100,
      question: {
        id: 'q1',
        text: 'How many?',
        answer: overrides?.answer ?? 50,
        category: 'test',
      },
      handContributions: Object.fromEntries(players.map((p) => [p.id, 25])),
    },
  }
  return gs
}

describe('buildTableResults', () => {
  it('marks pot winner, formats answers, and highlights You', () => {
    const gs = showdownState({
      answer: 50,
      pot: 90,
      players: [
        { id: 'a', name: 'Alice', submittedAnswer: 48 },
        { id: 'b', name: 'Bob', submittedAnswer: 50 },
        { id: 'c', name: 'Cara', submittedAnswer: 60 },
      ],
    })
    const results = buildTableResults(gs, 'a')
    expect(results).not.toBeNull()
    expect(results!.formattedCorrect).toBeTruthy()
    expect(results!.winnerIds).toEqual(['b'])
    expect(results!.winnerNames).toEqual(['Bob'])
    expect(formatWinnerLine(results!)).toBe('Pot: Bob')

    const alice = results!.rows.find((r) => r.playerId === 'a')!
    const bob = results!.rows.find((r) => r.playerId === 'b')!
    const cara = results!.rows.find((r) => r.playerId === 'c')!

    expect(alice.isYou).toBe(true)
    expect(bob.isYou).toBe(false)
    expect(bob.isPotWinner).toBe(true)
    expect(bob.chipPayout).toBeGreaterThan(0)
    expect(formatPotWin(bob.chipPayout)).toMatch(/^\+\$/)
    expect(bob.stack).toBe(1000 + bob.chipPayout)
    expect(cara.chipPayout).toBe(0)
    expect(cara.stack).toBe(1000)
    expect(formatPotWin(0)).toBe('—')
  })

  it('includes post-hand stack amounts per seat', () => {
    const gs = showdownState({
      pot: 60,
      players: [
        { id: 'a', name: 'Alice', submittedAnswer: 50, bankroll: 800 },
        { id: 'b', name: 'Bob', submittedAnswer: 99, bankroll: 400 },
      ],
    })
    const results = buildTableResults(gs, 'a')!
    const alice = results.rows.find((r) => r.playerId === 'a')!
    const bob = results.rows.find((r) => r.playerId === 'b')!
    expect(alice.stack).toBe(800 + alice.chipPayout)
    expect(bob.stack).toBe(400)
    expect(bob.chipPayout).toBe(0)
  })

  it('shows Folded and em dash for missing answers', () => {
    const gs = showdownState({
      players: [
        { id: 'a', name: 'Alice', submittedAnswer: 50 },
        { id: 'b', name: 'Bob', hasFolded: true },
        { id: 'c', name: 'Cara' },
      ],
    })
    const results = buildTableResults(gs, 'c')!
    expect(results.rows.find((r) => r.playerId === 'b')!.formattedAnswer).toBe('Folded')
    expect(results.rows.find((r) => r.playerId === 'c')!.formattedAnswer).toBe('—')
    expect(results.winnerIds).toEqual(['a'])
  })

  it('excludes pointsOnly from pot winners and labels unanswered points-only seats', () => {
    const gs = showdownState({
      answer: 10,
      players: [
        { id: 'a', name: 'Alice', submittedAnswer: 12 },
        { id: 'b', name: 'Broke', pointsOnly: true, submittedAnswer: 10, bankroll: 0 },
        { id: 'c', name: 'Chris', pointsOnly: true, bankroll: 0 },
      ],
    })
    const results = buildTableResults(gs, null)!
    expect(results.winnerIds).toEqual(['a'])
    expect(results.rows.find((r) => r.playerId === 'b')!.isPotWinner).toBe(false)
    expect(results.rows.find((r) => r.playerId === 'b')!.formattedAnswer).not.toBe('Points only')
    expect(results.rows.find((r) => r.playerId === 'c')!.formattedAnswer).toBe('Points only')
  })

  it('supports payout phase via coerced preview', () => {
    const gs = showdownState({
      phase: 'payout',
      answer: 100,
      pot: 40,
      players: [
        { id: 'a', name: 'Alice', submittedAnswer: 100 },
        { id: 'b', name: 'Bob', submittedAnswer: 200 },
      ],
    })
    const results = buildTableResults(gs, 'a')!
    expect(results.winnerIds).toEqual(['a'])
    expect(results.rows[0]!.chipPayout).toBeGreaterThan(0)
  })

  it('returns null outside post-hand phases', () => {
    const gs = showdownState({ players: [{ id: 'a', name: 'Alice', submittedAnswer: 1 }] })
    expect(buildTableResults({ ...gs, phase: 'lobby' }, 'a')).toBeNull()
    expect(buildTableResults({ ...gs, phase: 'betting' }, 'a')).toBeNull()
  })
})

describe('shouldClearTableResults', () => {
  it('clears when leaving lobby into a new hand', () => {
    expect(shouldClearTableResults('lobby', 'question')).toBe(true)
    expect(shouldClearTableResults('lobby', 'betting')).toBe(true)
    expect(shouldClearTableResults('showdown', 'lobby')).toBe(false)
  })
})
