import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerEndgameScreen from '../components/PlayerEndgameScreen'
import { playerEndgameView } from './playerEndgame'

describe('playerEndgameView', () => {
  it('shows the winner once the brief names the last stack', () => {
    expect(playerEndgameView({
      winnerName: 'Ada Lane',
      selfName: 'Ada Lane',
      selfBankroll: 4800,
    })).toEqual({ winnerName: 'Ada Lane', selfWon: true, bankroll: 4800 })
    expect(playerEndgameView({
      winnerName: 'Ada Lane',
      selfName: 'Bo Kim',
      selfBankroll: 0,
    })).toEqual({ winnerName: 'Ada Lane', selfWon: false, bankroll: null })
  })

  it('stays on the table while the brief has no winner', () => {
    expect(playerEndgameView({
      winnerName: null,
      selfName: 'Ada Lane',
      selfBankroll: 4800,
    })).toBeNull()
  })
})

describe('player endgame screen', () => {
  it('tells the last player they won and everyone else who won', () => {
    const won = renderToStaticMarkup(createElement(PlayerEndgameScreen, {
      winnerName: 'Ada Lane',
      selfWon: true,
      bankroll: 4800,
    }))
    expect(won).toContain('You won')
    expect(won).toContain('Ada Lane')
    expect(won).toContain('4,800')

    const lost = renderToStaticMarkup(createElement(PlayerEndgameScreen, {
      winnerName: 'Ada Lane',
      selfWon: false,
      bankroll: null,
    }))
    expect(lost).toContain('Game over')
    expect(lost).toContain('Ada Lane')
    expect(lost).not.toContain('You won')
  })
})
