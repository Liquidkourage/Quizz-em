import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueEndgameCard from './VenueEndgameCard'
import { formatVenueBankroll } from './venueLeaderboard'
import { endgameCoversFloor, venueEndgameWinner, type VenueEndgameWall } from './venueEndgame'

function wall(overrides: Partial<VenueEndgameWall> = {}): VenueEndgameWall {
  return {
    venueChipSurvivorCount: 1,
    venueHandsCompleted: 4,
    tiles: [
      {
        tableNum: 2,
        phase: 'lobby',
        seatNames: ['Ada Lane', ''],
        seatBankrolls: [4800, 0],
      },
    ],
    ...overrides,
  }
}

describe('venueEndgameWinner', () => {
  it('names the last player with chips once the hand is over', () => {
    expect(venueEndgameWinner(wall())).toEqual({
      name: 'Ada Lane',
      tableNum: 2,
      bankroll: 4800,
    })
  })

  it('stays quiet while a hand is still being played', () => {
    expect(venueEndgameWinner(wall({
      tiles: [
        {
          tableNum: 1,
          phase: 'showdown',
          seatNames: ['Ada Lane'],
          seatBankrolls: [4800],
        },
      ],
    }))).toBeNull()
  })

  it('stays quiet before any hand has finished', () => {
    expect(venueEndgameWinner(wall({ venueHandsCompleted: 0 }))).toBeNull()
  })

  it('stays quiet while two players still have chips', () => {
    expect(venueEndgameWinner(wall({
      venueChipSurvivorCount: 2,
      tiles: [
        {
          tableNum: 1,
          phase: 'lobby',
          seatNames: ['Ada Lane', 'Bo Kim'],
          seatBankrolls: [4800, 200],
        },
      ],
    }))).toBeNull()
  })
})

describe('endgame card', () => {
  it('covers the floor with the winner after the elimination card has left', () => {
    const winner = venueEndgameWinner(wall())
    expect(endgameCoversFloor(winner, { elimination: true, answer: false })).toBe(false)
    expect(endgameCoversFloor(winner, { elimination: false, answer: false })).toBe(true)
    const html = renderToStaticMarkup(createElement(VenueEndgameCard, { winner: winner! }))
    expect(html).toContain('Winner')
    expect(html).toContain('Ada L.')
    expect(html).toContain('Table 2')
    expect(html).toContain(formatVenueBankroll(4800))
    expect(html).toContain('venue-endgame')
    expect(html).not.toContain('opacity:0')
  })
})
