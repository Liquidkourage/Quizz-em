import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerEndgameScreen from '../components/PlayerEndgameScreen'
import { playerEndgameView } from './playerEndgame'

describe('playerEndgameView', () => {
  it('shows the winner once the brief names the last stack', () => {
    expect(playerEndgameView({
      winnerName: 'Ada Lane',
      chipNames: ['Ada Lane'],
      pointsNames: ['Bo Kim'],
      selfName: 'Ada Lane',
      selfBankroll: 4800,
    })).toEqual({
      winnerName: 'Ada Lane',
      chipNames: ['Ada Lane'],
      pointsNames: ['Bo Kim'],
      selfWonChips: true,
      selfWonPoints: false,
      bankroll: 4800,
    })
    expect(playerEndgameView({
      winnerName: 'Ada Lane',
      chipNames: ['Ada Lane'],
      pointsNames: ['Bo Kim'],
      selfName: 'Bo Kim',
      selfBankroll: 0,
    })).toEqual({
      winnerName: 'Ada Lane',
      chipNames: ['Ada Lane'],
      pointsNames: ['Bo Kim'],
      selfWonChips: false,
      selfWonPoints: true,
      bankroll: null,
    })
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
      chipNames: ['Ada Lane'],
      pointsNames: ['Bo Kim'],
      selfWonChips: true,
      selfWonPoints: false,
      bankroll: 4800,
    }))
    expect(won).toContain('You won the chips')
    expect(won).toContain('Chips: Ada Lane')
    expect(won).toContain('Points: Bo Kim')
    expect(won).toContain('This event is over and the room has closed.')
    expect(won).toContain('4,800')
    expect(won).toContain('chip-mark')
    expect(won.replace(/aria-label="[^"]*"/g, '')).not.toContain('$')

    const lost = renderToStaticMarkup(createElement(PlayerEndgameScreen, {
      winnerName: 'Ada Lane',
      chipNames: ['Ada Lane'],
      pointsNames: ['Bo Kim'],
      selfWonChips: false,
      selfWonPoints: false,
      bankroll: null,
    }))
    expect(lost).toContain('Game over')
    expect(lost).toContain('Chips: Ada Lane')
    expect(lost).toContain('Points: Bo Kim')
    expect(lost).toContain('This event is over and the room has closed.')
    expect(lost).not.toContain('You won')
  })
})
