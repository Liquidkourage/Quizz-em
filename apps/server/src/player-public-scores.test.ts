import { beforeEach, describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type GameState } from '@qhe/core'
import { buildPlayerVenueBrief, rooms, tableSessionKey, venueDisplayLayouts } from './game-ops'
import { clearVenueHostLog } from './venue-host-log'
import { playerPublicScores } from './player-public-scores'

beforeEach(() => {
  rooms.clear()
  venueDisplayLayouts.clear()
  clearVenueHostLog('SCORES')
})

describe('player public scores', () => {
  it('ranks chip stacks and leaves points-only players off the board', () => {
    const scores = playerPublicScores(
      'leaderboard',
      [
        { name: 'Ada', bankroll: 400, pointsOnly: false, tableNum: 2 },
        { name: 'Cy', bankroll: 900, pointsOnly: true, tableNum: 1 },
        { name: 'Bo', bankroll: 1500, pointsOnly: false, tableNum: 1 },
      ],
      [],
    )
    expect(scores).toEqual({
      scoresBoard: 'chips',
      scores: [
        { name: 'Bo', value: 1500, tableNum: 1, points: 0 },
        { name: 'Ada', value: 400, tableNum: 2, points: 0 },
      ],
    })
  })

  it('ranks the people who are out, and leaves chip players off', () => {
    const scores = playerPublicScores(
      'leaderboard-trivia',
      [
        { name: 'Ada', bankroll: 400, pointsOnly: false, tableNum: 1 },
        { name: 'Bo', bankroll: 0, pointsOnly: true, tableNum: 1 },
      ],
      [
        { name: 'Ada', answerPoints: 90.5 },
        { name: 'Bo', answerPoints: 40.2 },
        { name: 'Cy', answerPoints: 12.9 },
      ],
    )
    expect(scores.scores.map((row) => row.name)).toEqual(['Bo', 'Cy'])
  })

  it('ranks trivia points when the host shows that board', () => {
    const scores = playerPublicScores(
      'leaderboard-trivia',
      [],
      [
        { name: 'Bo', answerPoints: 4 },
        { name: 'Ada', answerPoints: 10 },
      ],
    )
    expect(scores.scoresBoard).toBe('trivia')
    expect(scores.scores.map((row) => row.name)).toEqual(['Ada', 'Bo'])
  })

  it('stays off the phone for every other display mode', () => {
    for (const wallView of ['floor', 'rules', 'event', 'seating-chart', 'busts']) {
      expect(playerPublicScores(wallView, [], []).scoresBoard).toBeNull()
    }
  })
})

describe('player venue brief scores', () => {
  it('sends the chip board the host is showing on the TVs', () => {
    let gs = addPlayer(createEmptyGame('SCORES', 'h', '1'), 'b', 'Bo', 1500)
    gs = addPlayer(gs, 'c', 'Cy', 900)
    gs = {
      ...gs,
      players: gs.players.map((player) =>
        player.id === 'c' ? { ...player, pointsOnly: true } : player,
      ),
    } as GameState
    rooms.set(tableSessionKey('SCORES', '1'), gs)
    venueDisplayLayouts.set('SCORES', { layout: 'venueWall', focusTable: null, wallView: 'leaderboard' })
    const brief = buildPlayerVenueBrief('scores')
    expect(brief.scoresBoard).toBe('chips')
    expect(brief.scores).toEqual([{ name: 'Bo', value: 1500, tableNum: 1, points: 0 }])
  })
})
