import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  formatVenueTriviaPoints,
  normalizeVenuePointsStandings,
  triviaLeaderboardSource,
  venueTriviaLeaderboardRowsFromTiles,
  venueWallScoreLists,
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
        seatPointsOnly: [true, true, false, false, false, false, false, false],
      },
    ]
    const rows = venueTriviaLeaderboardRowsFromTiles(tiles)
    expect(rows.map((r) => r.name)).toEqual(['Bob B.', 'Alice A.'])
    expect(rows[0]?.answerPoints).toBe(90)
  })

  it('keeps hundredths instead of dropping them', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 1,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Ada Lane'],
        seatAnswerPoints: [90.5],
        seatPointsOnly: [true, false, false, false, false, false, false, false],
      },
    ]
    const rows = venueTriviaLeaderboardRowsFromTiles(tiles, [{ name: 'Bo Kent', answerPoints: 40.25 }])
    expect(rows.map((row) => row.answerPoints)).toEqual([90.5, 40.25])
    expect(formatVenueTriviaPoints(rows[0]?.answerPoints ?? 0)).toBe('90.50 pts')
    expect(normalizeVenuePointsStandings([{ name: 'Bo Kent', answerPoints: 40.25 }])).toEqual([
      { name: 'Bo Kent', answerPoints: 40.25 },
    ])
  })

  it('leaves chip players off and keeps the people who are out', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 2,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Alice A.', 'Blake B.'],
        seatBankrolls: [500, 0],
        seatAnswerPoints: [10, 20],
        seatPointsOnly: [false, true, false, false, false, false, false, false],
      },
    ]
    const rows = venueTriviaLeaderboardRowsFromTiles(tiles, [
      { name: 'Alice A.', answerPoints: 80 },
      { name: 'Carla C.', answerPoints: 5 },
    ])
    expect(rows.map((row) => row.name)).toEqual(['Blake B.', 'Carla C.'])
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
    expect(rows.map((row) => row.name)).toEqual(['Bo Kent'])
  })

  it('uses the remembered field when chairs no longer list everyone', () => {
    const tiles: DisplayVenueTileSnapshot[] = [
      {
        tableNum: 1,
        seated: 1,
        pot: 0,
        phase: 'lobby',
        seatNames: ['Ada Lane'],
        seatAnswerPoints: [10],
      },
    ]
    const field = [
      { name: 'Ada Lane', answerPoints: 10 },
      { name: 'Bo Kent', answerPoints: 4 },
      { name: 'Cy Drew', answerPoints: 0 },
    ]
    const rows = triviaLeaderboardSource(tiles, [], field)
    expect(rows.map((row) => row.name)).toEqual(['Bo Kent', 'Cy Drew'])
  })

  it('keeps the night list the phone already shows', () => {
    expect(
      venueWallScoreLists({
        pointsStandings: [{ name: 'Bo Kent', answerPoints: 4 }],
        triviaField: [
          { name: 'Bo Kent', answerPoints: 4 },
          { name: 'Cy Drew', answerPoints: 1 },
        ],
      }),
    ).toEqual({
      pointsStandings: [{ name: 'Bo Kent', answerPoints: 4 }],
      triviaField: [
        { name: 'Bo Kent', answerPoints: 4 },
        { name: 'Cy Drew', answerPoints: 1 },
      ],
    })
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
