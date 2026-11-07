import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlayerStillSeated } from './components/PlayerQuitButton'
import { resumeHelloScreen } from './playerResume'

describe('resumeHelloScreen', () => {
  it('sits a saved phone down when the room still knows that id', () => {
    expect(resumeHelloScreen('saved-phone', true, 'Reconnected at table 1')).toBe('seat')
  })

  it('keeps a saved phone off the join form when that name is already seated', () => {
    expect(
      resumeHelloScreen(
        'saved-phone',
        false,
        'That name is already in the lobby. Use a unique name or reopen the join link on the same phone to reconnect.',
      ),
    ).toBe('still-seated')
    expect(
      resumeHelloScreen('saved-phone', false, 'That name is already in the game. Use a unique name.'),
    ).toBe('still-seated')
  })

  it('leaves a typed join on the form so a duplicate name can be edited', () => {
    expect(
      resumeHelloScreen('join-form', false, 'That name is already in the lobby.'),
    ).toBe('form')
  })

  it('opens the form when a saved phone cannot find the room', () => {
    expect(resumeHelloScreen('saved-phone', false, 'No game found for that venue code. Check the code on the TV.')).toBe(
      'form',
    )
  })
})

describe('PlayerStillSeated', () => {
  it('offers another try and does not show the name fields', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerStillSeated, {
        message: 'That name is already in the lobby.',
        onTryAgain: () => {},
      }),
    )
    expect(html).toContain('Still in the room')
    expect(html).toContain('Try again')
    expect(html).toContain('That name is already in the lobby.')
    expect(html).not.toContain('First name')
  })
})
