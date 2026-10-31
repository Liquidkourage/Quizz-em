import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostCollapsible } from './hostDeskLayout'

describe('HostCollapsible', () => {
  it('keeps the section closed until the host opens the popup', () => {
    const html = renderToStaticMarkup(
      <HostCollapsible summary="Practice bots">
        <p>Seed rehearsal</p>
      </HostCollapsible>,
    )
    expect(html).toContain('Practice bots')
    expect(html).toContain('Open')
    expect(html).not.toContain('Seed rehearsal')
    expect(html).not.toContain('role="dialog"')
  })

  it('opens the popup immediately when the desk forces it', () => {
    const html = renderToStaticMarkup(
      <HostCollapsible summary="Player actions" forceOpen>
        <p>Tables out of sync</p>
      </HostCollapsible>,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Tables out of sync')
    expect(html).toContain('Close')
  })
})
