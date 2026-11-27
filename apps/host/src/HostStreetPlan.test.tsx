import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostStreetPlan } from './HostStreetPlan'

describe('HostStreetPlan', () => {
  it('offers the original hand, one street, and a 3 then 2 split', () => {
    const html = renderToStaticMarkup(createElement(HostStreetPlan, { plan: [0, 5], onApply: () => {} }))
    expect(html).toContain('Original')
    expect(html).toContain('One street')
    expect(html).toContain('3 then 2')
    expect(html).toContain('Public cards on street 1')
    expect(html).toContain('Public cards on street 2')
    expect(html).toContain('Use 0 + 5')
  })
})
