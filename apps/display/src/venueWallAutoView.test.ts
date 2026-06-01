import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  INITIAL_VENUE_WALL_AUTO_VIEW_STATE,
  stepVenueWallAutoView,
} from './venueWallAutoView'

function tile(phase: string, tableNum = 1): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 6,
    pot: 0,
    phase,
    seatNames: ['Alice C.', 'Bob H.', '', '', '', '', '', ''],
    seatBankrolls: [1000, 1000, 0, 0, 0, 0, 0, 0],
  }
}

describe('stepVenueWallAutoView', () => {
  it('shows floor during an active hand', () => {
    const { view } = stepVenueWallAutoView(INITIAL_VENUE_WALL_AUTO_VIEW_STATE, [tile('betting')], 'betting')
    expect(view).toBe('floor')
  })

  it('latches leaderboard after showdown clears to lobby', () => {
    let state = INITIAL_VENUE_WALL_AUTO_VIEW_STATE
    ;({ state } = stepVenueWallAutoView(state, [tile('showdown')], 'showdown'))
    const afterPayout = stepVenueWallAutoView(state, [tile('lobby')], null)
    expect(afterPayout.view).toBe('leaderboard')
    expect(afterPayout.state.latchedLeaderboard).toBe(true)
  })

  it('returns to floor when the next question opens', () => {
    let state = INITIAL_VENUE_WALL_AUTO_VIEW_STATE
    ;({ state } = stepVenueWallAutoView(state, [tile('showdown')], 'showdown'))
    ;({ state } = stepVenueWallAutoView(state, [tile('lobby')], null))
    const nextQ = stepVenueWallAutoView(state, [tile('question')], 'question')
    expect(nextQ.view).toBe('floor')
    expect(nextQ.state.latchedLeaderboard).toBe(false)
  })

  it('does not auto-leaderboard pre-show lobby', () => {
    const { view } = stepVenueWallAutoView(INITIAL_VENUE_WALL_AUTO_VIEW_STATE, [tile('lobby')], null)
    expect(view).toBe(null)
  })
})
