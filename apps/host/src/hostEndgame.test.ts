import { describe, expect, it } from 'vitest'
import { hostEndgameHeadline, hostEndgameWinnerName } from './hostEndgame'

describe('hostEndgameWinnerName', () => {
  it('names the last player once a hand has been paid and the tables are waiting', () => {
    expect(hostEndgameWinnerName({
      fieldPlayerCount: 1,
      handsCompleted: 4,
      actionRows: [{ phase: 'lobby', seated: 1 }],
      roster: [{ name: 'Ada Lane' }],
    })).toBe('Ada Lane')
  })

  it('stays quiet while the last hand is still being played', () => {
    expect(hostEndgameWinnerName({
      fieldPlayerCount: 1,
      handsCompleted: 4,
      actionRows: [{ phase: 'showdown', seated: 1 }],
      roster: [{ name: 'Ada Lane' }],
    })).toBeNull()
  })
})

describe('host endgame headline', () => {
  it('tells the host the night is over', () => {
    const cue = hostEndgameHeadline('Ada Lane')
    expect(cue.title).toBe('Game over')
    expect(cue.detail).toContain('Ada Lane')
  })
})
