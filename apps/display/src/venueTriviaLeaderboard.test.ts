import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { venueTriviaLeaderboardRowsFromTiles } from './venueLeaderboard'

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

  it('keeps a points-only player on the trivia scores', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 2,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Ada Lane', 'Bo Kent'],
        seatBankrolls: [500, 0],
        seatPointsOnly: [false, true],
        seatAnswerPoints: [10, 40],
      },
    ]
    expect(venueTriviaLeaderboardRowsFromTiles(tiles).map((row) => row.name)).toEqual(['Bo Kent', 'Ada Lane'])
  })
})
