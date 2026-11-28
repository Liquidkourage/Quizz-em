import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostHoleDeal } from './HostHoleDeal'

describe('HostHoleDeal', () => {
  it('starts on the host deal and offers the 10 second option', () => {
    const html = renderToStaticMarkup(createElement(HostHoleDeal, { holeDeal: undefined, onChoose: () => {} }))
    expect(html).toContain('You deal them')
    expect(html).toContain('10 seconds later')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('The hole cards wait until you press Deal hole cards.')
  })
})