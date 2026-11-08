import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { HostMosaicPreviewPanel } from './HostMosaicPreviewPanel'

describe('HostMosaicPreviewPanel', () => {
  it('offers a button for every mosaic size and a way to put the TVs back', () => {
    const idle = renderToStaticMarkup(
      createElement(HostMosaicPreviewPanel, { activeCount: null, onShow: () => {} }),
    )
    for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n += 1) {
      expect(idle).toContain(`Show ${n} tables`)
    }
    expect(idle).toContain('Close mosaic')
    expect(idle).toContain('live game')

    const showing = renderToStaticMarkup(
      createElement(HostMosaicPreviewPanel, { activeCount: 6, onShow: () => {} }),
    )
    expect(showing).toContain('aria-pressed="true"')
    expect(showing).toContain('Showing 6 tables')
  })
})
