import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import JoinScreen from './components/JoinScreen'
import type { PlayerJoinBootstrap } from './playerUrlParams'
import { shouldSeatFromJoinAttempt } from './playerJoinSubmit'

const filled: PlayerJoinBootstrap = {
  firstName: 'Ada',
  lastInitial: 'L',
  roomCode: 'HOST01',
  autoSeat: true,
  tableId: 'lobby',
  playerId: 'human:1',
  roomFromUrl: true,
  nameFromUrl: false,
}

describe('shouldSeatFromJoinAttempt', () => {
  it('does not seat a player when a filled form submits from an edit', () => {
    expect(shouldSeatFromJoinAttempt('edit', true)).toBe(false)
  })

  it('seats only when Join is tapped and the form is complete', () => {
    expect(shouldSeatFromJoinAttempt('join-button', true)).toBe(true)
    expect(shouldSeatFromJoinAttempt('join-button', false)).toBe(false)
  })
})

describe('JoinScreen', () => {
  it('renders Join as a button so a prefilled name edit cannot submit the form', () => {
    const html = renderToStaticMarkup(
      createElement(JoinScreen, { prefs: filled, onChange: () => {}, onJoin: () => {} }),
    )
    expect(html).toContain('type="button"')
    expect(html).not.toContain('type="submit"')
  })
})
