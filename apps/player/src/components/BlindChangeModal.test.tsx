import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BlindChangeModal from './BlindChangeModal'

describe('BlindChangeModal', () => {
  it('shows the new blinds', () => {
    const html = renderToStaticMarkup(
      createElement(BlindChangeModal, { notice: { smallBlind: 15, bigBlind: 30, atMs: 1 } }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Blinds')
    expect(html).toContain('aria-label="$15 / $30"')
  })
})
