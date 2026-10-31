import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  INITIAL_VENUE_WALL_AUTO_VIEW_STATE,
  resolveAudienceWallView,
  stepVenueWallAutoView,
  venueWallFloorIsLive,
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

describe('resolveAudienceWallView', () => {
  it('keeps chip and trivia scores on the TVs during a hand', () => {
    expect(resolveAudienceWallView('leaderboard', 'floor')).toBe('leaderboard')
    expect(resolveAudienceWallView('leaderboard-trivia', 'floor')).toBe('leaderboard-trivia')
  })

  it('keeps trivia scores up after the hand, when the automatic board is chips', () => {
    expect(resolveAudienceWallView('leaderboard-trivia', 'leaderboard')).toBe('leaderboard-trivia')
  })

  it('lets Tables follow the automatic view', () => {
    expect(resolveAudienceWallView('floor', 'floor')).toBe('floor')
    expect(resolveAudienceWallView('floor', 'leaderboard')).toBe('leaderboard')
    expect(resolveAudienceWallView('rules', 'floor')).toBe('rules')
  })
})

describe('venueWallFloorIsLive', () => {
  it('is true when headline is wagering even if tiles still lobby', () => {
    expect(venueWallFloorIsLive([tile('lobby')], 'betting')).toBe(true)
  })

  it('is false when every tile and headline are lobby', () => {
    expect(venueWallFloorIsLive([tile('lobby')], 'lobby')).toBe(false)
    expect(venueWallFloorIsLive([tile('lobby')], null)).toBe(false)
  })
})
