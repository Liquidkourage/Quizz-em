import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PLAYER_PHASE_PREVIEWS } from '@qhe/core'
import { HostPlayerPhasePreviewPanel } from './HostPlayerPhasePreviewPanel'

describe('HostPlayerPhasePreviewPanel', () => {
  it('offers a show button for every player screen and a way to put the phones back', () => {
    const idle = renderToStaticMarkup(
      createElement(HostPlayerPhasePreviewPanel, { activeScene: null, onShow: () => {} }),
    )
    for (const scene of PLAYER_PHASE_PREVIEWS) {
      expect(idle).toContain(scene.show)
    }
    expect(idle).toContain('Close player preview')
    expect(idle).toContain('live game')

    const showing = renderToStaticMarkup(
      createElement(HostPlayerPhasePreviewPanel, { activeScene: 'turn', onShow: () => {} }),
    )
    expect(showing).toContain('aria-pressed="true"')
    expect(showing).toContain('Showing your turn')
  })
})
