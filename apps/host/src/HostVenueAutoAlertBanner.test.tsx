import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HostVenueAutoAlertBanner from './HostVenueAutoAlertBanner'

describe('venue state notification', () => {
  it('floats a short notice instead of a block that pushes the desk', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueAutoAlertBanner, {
        alert: {
          kind: 'round1-all-in',
          title: 'Round 1 complete',
          detail: 'All pre-board wagers are in on every table.',
        },
      }),
    )
    expect(html).toContain('Round 1 complete')
    expect(html).toContain('fixed')
    expect(html).not.toContain('mb-4')
    expect(html).not.toContain('text-2xl')
  })
})
