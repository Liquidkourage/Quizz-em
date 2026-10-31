import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostModeNav } from './HostModeNav'
import { HostMoreMenu } from './HostMoreMenu'

describe('HostModeNav', () => {
  it('places More to the right of Pre-show, Live, and Questions', () => {
    const html = renderToStaticMarkup(
      <HostModeNav
        mode="preshow"
        onSelect={() => {}}
        liveCount={0}
        more={
          <HostMoreMenu>
            <p>Hard reset</p>
          </HostMoreMenu>
        }
      />,
    )
    const preshow = html.indexOf('Pre-show')
    const live = html.indexOf('>Live<')
    const questions = html.indexOf('Questions')
    const more = html.indexOf('>More<')
    expect(preshow).toBeGreaterThanOrEqual(0)
    expect(live).toBeGreaterThan(preshow)
    expect(questions).toBeGreaterThan(live)
    expect(more).toBeGreaterThan(questions)
    const between = html.slice(questions, more)
    expect(between).not.toContain('ml-auto')
    const moreButton = html.slice(html.lastIndexOf('<button', more), more)
    expect(moreButton).not.toContain('ml-auto')
    expect(moreButton).not.toContain('w-full')
    expect(html).not.toContain('Hard reset')
    expect(html).not.toContain('role="dialog"')
  })
})
