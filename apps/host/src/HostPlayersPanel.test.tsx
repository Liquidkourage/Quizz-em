import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostPlayersPanel } from './HostPlayersPanel'

describe('HostPlayersPanel', () => {
  it('lists every name on its own row, with the table and a remove button', () => {
    const html = renderToStaticMarkup(
      createElement(HostPlayersPanel, {
        roster: [
          { playerId: 'human:b', name: 'Bo Kent', tableNum: 4 },
          { playerId: 'human:a', name: 'Ada Lane', tableNum: 2 },
        ],
        waiting: [{ id: 'human:c', name: 'Cara Moss' }],
        hostPlayerLabel: (name: string) => name,
        onRemove: () => {},
        onMove: () => {},
      }),
    )
    const cara = html.indexOf('Cara Moss')
    const ada = html.indexOf('Ada Lane')
    const bo = html.indexOf('Bo Kent')
    expect(cara).toBeGreaterThan(-1)
    expect(ada).toBeGreaterThan(cara)
    expect(bo).toBeGreaterThan(ada)
    expect(html.slice(cara, ada)).toContain('Waiting')
    expect(html.slice(ada, bo)).toContain('Table 2')
    expect(html.slice(bo)).toContain('Table 4')
    expect(html).toContain('Remove Ada Lane')
    expect(html).toContain('Move Ada Lane to')
    expect(html).not.toContain('truncate')
    expect(html).not.toContain('Move Cara Moss')
  })

  it('says the room is empty when nobody has joined', () => {
    const html = renderToStaticMarkup(
      createElement(HostPlayersPanel, {
        roster: [],
        hostPlayerLabel: (name: string) => name,
        onRemove: () => {},
      }),
    )
    expect(html).toContain('No one in the room yet.')
  })
})
