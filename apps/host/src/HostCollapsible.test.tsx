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

  it('shows Beat-style sections on the page when they are expanded', () => {
    const html = renderToStaticMarkup(
      <HostCollapsible summary="Venue felts · beat" expanded>
        <p>Table 1 betting</p>
      </HostCollapsible>,
    )
    expect(html).toContain('Venue felts · beat')
    expect(html).toContain('Table 1 betting')
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('>Open<')
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
