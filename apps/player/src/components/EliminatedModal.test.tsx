import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EliminatedModal from './EliminatedModal'

describe('EliminatedModal', () => {
  it('names the player who just busted on this phone', () => {
    const html = renderToStaticMarkup(
      createElement(EliminatedModal, { name: 'Ada Lane', onDone: () => {} }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Ada Lane')
    expect(html).toContain('Out of chips')
    expect(html).not.toContain('Players who busted')
    expect(html).not.toContain('Thanks for playing')
  })
})
