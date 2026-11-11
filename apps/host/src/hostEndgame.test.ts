import { describe, expect, it } from 'vitest'
import { hostEndgameHeadline, hostEndgameWinnerName } from './hostEndgame'

describe('hostEndgameWinnerName', () => {
  it('names the winner the room already published', () => {
    expect(hostEndgameWinnerName({ endgameWinnerName: 'Ada Lane' })).toBe('Ada Lane')
  })

  it('stays quiet when the room has not named a winner', () => {
    expect(hostEndgameWinnerName({ endgameWinnerName: null })).toBeNull()
    expect(hostEndgameWinnerName(null)).toBeNull()
  })
})

describe('host endgame headline', () => {
  it('tells the host the night is over', () => {
    const cue = hostEndgameHeadline('Ada Lane', ['Bo Kim'])
    expect(cue.title).toBe('Game over')
    expect(cue.detail).toBe('Chips: Ada Lane. Points: Bo Kim.')
  })
})
