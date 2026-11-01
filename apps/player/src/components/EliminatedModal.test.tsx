import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EliminatedModal from './EliminatedModal'

describe('EliminatedModal', () => {
  it('shows the eliminated screen as a dialog with the player name', () => {
    const html = renderToStaticMarkup(
      createElement(EliminatedModal, { playerName: 'Ada L.', onDone: () => {} }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Eliminated')
    expect(html).toContain('Ada L.')
    expect(html).toContain('out of the chip contest')
  })
})
