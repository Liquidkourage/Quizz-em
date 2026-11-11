import { describe, expect, it } from 'vitest'
import { nightAwards, soleChipWinner, soleChipWinnerName } from './venue-endgame'

describe('soleChipWinnerName', () => {
  it('names the last stack once the room is between hands', () => {
    expect(soleChipWinnerName(3, [
      { phase: 'lobby', players: [{ name: 'Ada Lane', bankroll: 4800 }] },
    ])).toBe('Ada Lane')
  })

  it('stays quiet during a hand and before the first payout', () => {
    expect(soleChipWinnerName(3, [
      { phase: 'showdown', players: [{ name: 'Ada Lane', bankroll: 4800 }] },
    ])).toBeNull()
    expect(soleChipWinnerName(0, [
      { phase: 'lobby', players: [{ name: 'Ada Lane', bankroll: 4800 }] },
    ])).toBeNull()
  })

  it('returns the table and the stack along with the name', () => {
    expect(soleChipWinner(1, [
      { tableNum: 4, phase: 'lobby', players: [{ name: 'Bea Moss', bankroll: 900 }] },
    ])).toEqual({ name: 'Bea Moss', tableNum: 4, bankroll: 900 })
  })

  it('stays quiet while two stacks remain', () => {
    expect(soleChipWinnerName(2, [
      {
        phase: 'lobby',
        players: [
          { name: 'Ada Lane', bankroll: 4800 },
          { name: 'Bo Kim', bankroll: 200 },
        ],
      },
    ])).toBeNull()
  })
})

describe('nightAwards', () => {
  const table = (
    players: { name: string; bankroll: number; answerPoints?: number }[],
    phase = 'lobby',
  ) => ({ phase, players })

  it('names the last stack and gives points to the best of the rest', () => {
    const awards = nightAwards(4, 25, [
      table([
        { name: 'Ada Lane', bankroll: 4800, answerPoints: 80 },
        { name: 'Bo Kim', bankroll: 0, answerPoints: 40 },
      ]),
    ])
    expect(awards?.chipWinners.map((row) => row.name)).toEqual(['Ada Lane'])
    expect(awards?.pointsWinners.map((row) => row.name)).toEqual(['Bo Kim'])
  })

  it('after 25 hands gives the chips to the biggest stack and the points to someone else', () => {
    const awards = nightAwards(25, 25, [
      table([
        { name: 'Ada Lane', bankroll: 3000, answerPoints: 90 },
        { name: 'Bo Kim', bankroll: 1200, answerPoints: 70 },
        { name: 'Cy Moss', bankroll: 0, answerPoints: 40 },
      ]),
    ])
    expect(awards?.chipWinners.map((row) => row.name)).toEqual(['Ada Lane'])
    expect(awards?.pointsWinners.map((row) => row.name)).toEqual(['Bo Kim'])
  })

  it('breaks an even stack with points, and shares when the points are even too', () => {
    const broken = nightAwards(25, 25, [
      table([
        { name: 'Ada Lane', bankroll: 2000, answerPoints: 50 },
        { name: 'Bo Kim', bankroll: 2000, answerPoints: 80 },
      ]),
    ])
    expect(broken?.chipWinners.map((row) => row.name)).toEqual(['Bo Kim'])
    expect(broken?.pointsWinners.map((row) => row.name)).toEqual(['Ada Lane'])

    const shared = nightAwards(25, 25, [
      table([
        { name: 'Ada Lane', bankroll: 2000, answerPoints: 50 },
        { name: 'Bo Kim', bankroll: 2000, answerPoints: 50 },
        { name: 'Cy Moss', bankroll: 100, answerPoints: 10 },
      ]),
    ])
    expect(shared?.chipWinners.map((row) => row.name).sort()).toEqual(['Ada Lane', 'Bo Kim'])
    expect(shared?.pointsWinners.map((row) => row.name)).toEqual(['Cy Moss'])
  })

  it('shares the points when the best of the rest are tied', () => {
    const awards = nightAwards(25, 25, [
      table([
        { name: 'Ada Lane', bankroll: 3000, answerPoints: 10 },
        { name: 'Bo Kim', bankroll: 100, answerPoints: 40 },
        { name: 'Cy Moss', bankroll: 0, answerPoints: 40 },
      ]),
    ])
    expect(awards?.pointsWinners.map((row) => row.name).sort()).toEqual(['Bo Kim', 'Cy Moss'])
  })

  it('stays quiet before 25 while more than one stack remains, and during a hand', () => {
    const playing = [
      table([
        { name: 'Ada Lane', bankroll: 3000, answerPoints: 90 },
        { name: 'Bo Kim', bankroll: 1200, answerPoints: 70 },
      ]),
    ]
    expect(nightAwards(24, 25, playing)).toBeNull()
    expect(nightAwards(25, 25, [
      table([
        { name: 'Ada Lane', bankroll: 3000, answerPoints: 90 },
        { name: 'Bo Kim', bankroll: 1200, answerPoints: 70 },
      ], 'showdown'),
    ])).toBeNull()
  })
})
