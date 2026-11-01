import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EliminatedModal from './EliminatedModal'

describe('EliminatedModal', () => {
  it('names the hand’s busts without a harsh title', () => {
    const html = renderToStaticMarkup(createElement(EliminatedModal, { onDone: () => {} }))
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Players who busted this hand')
    expect(html).not.toContain('Eliminated')
    expect(html).not.toContain('out of the chip contest')
    expect(html).not.toContain('Thanks for playing')
  })
})
