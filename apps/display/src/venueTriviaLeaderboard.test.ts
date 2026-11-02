import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  normalizeVenuePointsStandings,
  venueTriviaLeaderboardRowsFromTiles,
} from './venueLeaderboard'

describe('venueTriviaLeaderboardRowsFromTiles', () => {
  it('ranks by answerPoints descending', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 2,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Alice A.', 'Bob B.'],
        seatBankrolls: [100, 200],
        seatAnswerPoints: [40, 90],
      },
    ]
    const rows = venueTriviaLeaderboardRowsFromTiles(tiles)
    expect(rows.map((r) => r.name)).toEqual(['Bob B.', 'Alice A.'])
    expect(rows[0]?.answerPoints).toBe(90)
  })

  it('counts an eliminated player who shares a name with someone still seated', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 2,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Alice A.', 'Blake B.'],
        seatBankrolls: [500, 500],
        seatAnswerPoints: [10, 20],
      },
    ]
    const rows = venueTriviaLeaderboardRowsFromTiles(tiles, [
      { name: 'Alice A.', answerPoints: 80 },
      { name: 'Alice A.', answerPoints: 30 },
      { name: 'Carla C.', answerPoints: 5 },
    ])
    expect(rows).toHaveLength(5)
    expect(rows.filter((row) => row.name === 'Alice A.')).toHaveLength(3)
  })

  it('keeps a points-only player on the trivia scores without a seat', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 1,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Ada Lane'],
        seatBankrolls: [500],
        seatAnswerPoints: [10],
      },
    ]
    const rows = venueTriviaLeaderboardRowsFromTiles(tiles, [{ name: 'Bo Kent', answerPoints: 40 }])
    expect(rows.map((row) => row.name)).toEqual(['Bo Kent', 'Ada Lane'])
  })

  it('keeps a player with no chips on the wall snapshot', () => {
    expect(
      normalizeVenuePointsStandings([
        { name: 'Bo Kent', answerPoints: 40 },
        { name: '  ', answerPoints: 5 },
      ]),
    ).toEqual([{ name: 'Bo Kent', answerPoints: 40 }])
  })
})
