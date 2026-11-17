import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, endRound, excuseGuess, handHistoryForTable, type GameState } from './index'

function showdown(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'ada', 'Ada', 480)
  gs = addPlayer(gs, 'bo', 'Bo', 480)
  return {
    ...gs,
    phase: 'showdown',
    round: {
      ...gs.round,
      pot: 40,
      handContributions: { ada: 20, bo: 20 },
      question: { id: 'q', text: 'How many moons?', answer: 10 },
    },
    players: gs.players.map((player) =>
      player.id === 'ada' ? { ...player, submittedAnswer: 14 } : { ...player, hasFolded: true },
    ),
  }
}

describe('hand history for one paid question', () => {
  it('keeps the guess, the distance, the chips, and the points', () => {
    const before = showdown()
    const lines = handHistoryForTable(before, endRound(before), 3)
    const ada = lines.find((line) => line.playerId === 'ada')
    const bo = lines.find((line) => line.playerId === 'bo')
    expect(ada).toMatchObject({
      questionNum: 3,
      prompt: 'How many moons?',
      guess: 14,
      guessLabel: 'sent',
      offBy: 4,
      chips: 'won',
      amount: 40,
      stackAfter: 520,
      pointsGained: 60,
    })
    expect(bo).toMatchObject({
      guess: null,
      guessLabel: 'none',
      offBy: null,
      chips: 'folded',
      amount: 20,
      stackAfter: 480,
      pointsGained: 0,
    })
  })

  it('records an excuse as a question that did not count', () => {
    const before = excuseGuess(
      {
        ...showdown(),
        players: showdown().players.map((player) =>
          player.id === 'bo' ? { ...player, hasFolded: false } : player,
        ),
      },
      'bo',
    )
    const bo = handHistoryForTable(before, endRound(before), 4).find((line) => line.playerId === 'bo')
    expect(bo).toMatchObject({
      guessLabel: 'excused',
      chips: 'lost',
      amount: 20,
      pointsGained: 0,
      stackAfter: 480,
    })
  })
})
