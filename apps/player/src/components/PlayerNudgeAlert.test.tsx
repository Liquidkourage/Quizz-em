import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerNudgeAlert from './PlayerNudgeAlert'

describe('PlayerNudgeAlert', () => {
  it('flashes the phone and names what the host is waiting on', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerNudgeAlert, {
        message: 'You have 30 seconds to act. Then you check or fold.',
        onDone: () => {},
      }),
    )
    expect(html).toContain('role="alertdialog"')
    expect(html).toContain('player-nudge-alert-flash')
    expect(html).toContain('Host nudge')
    expect(html).toContain('You have 30 seconds to act. Then you check or fold.')
  })
})
