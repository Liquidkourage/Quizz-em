import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlayerQuitButton } from './components/PlayerQuitButton'

describe('PlayerQuitButton', () => {
  it('starts as a quiet quit control', () => {
    const html = renderToStaticMarkup(createElement(PlayerQuitButton, { onQuit: () => {} }))
    expect(html).toContain('Quit')
  })
})
