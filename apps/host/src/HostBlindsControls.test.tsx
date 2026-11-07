import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostBlindsControls } from './hostDeskLayout'

describe('HostBlindsControls', () => {
  it('sets the venue blinds without a level schedule', () => {
    const html = renderToStaticMarkup(
      createElement(HostBlindsControls, {
        venueSmallBlind: 10,
        venueBigBlind: 20,
        blindLevelSummary: '$10 / $20 · Level 1/6',
        onVenueSmallBlindChange: () => {},
        onVenueBigBlindChange: () => {},
        onSaveVenueBlinds: () => {},
      }),
    )
    expect(html).toContain('Small blind')
    expect(html).toContain('Big blind')
    expect(html).toContain('Save venue blinds')
    expect(html).not.toContain('Per-table override')
    expect(html).not.toContain('Level up every')
    expect(html).not.toContain('Save schedule')
  })
})
