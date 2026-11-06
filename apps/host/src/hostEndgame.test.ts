import { describe, expect, it } from 'vitest'
import { hostEndgameHeadline, hostEndgameWinnerName } from './hostEndgame'

describe('hostEndgameWinnerName', () => {
  it('names the winner the room already published, even while busted players stay listed', () => {
    expect(hostEndgameWinnerName({
      endgameWinnerName: 'Ada Lane',
      fieldPlayerCount: 1,
      handsCompleted: 4,
      actionRows: [{ phase: 'lobby', seated: 3 }],
      roster: [{ name: 'Ada Lane' }, { name: 'Bo Kim' }, { name: 'Cy Diaz' }],
    })).toBe('Ada Lane')
  })

  it('stays quiet when the room has not named a winner', () => {
    expect(hostEndgameWinnerName({
      endgameWinnerName: null,
      fieldPlayerCount: 1,
      handsCompleted: 4,
      actionRows: [{ phase: 'lobby', seated: 1 }],
      roster: [{ name: 'Ada Lane' }],
    })).toBeNull()
    expect(hostEndgameWinnerName(null)).toBeNull()
  })
})

describe('host endgame headline', () => {
  it('tells the host the night is over', () => {
    const cue = hostEndgameHeadline('Ada Lane')
    expect(cue.title).toBe('Game over')
    expect(cue.detail).toContain('Ada Lane')
  })
})
