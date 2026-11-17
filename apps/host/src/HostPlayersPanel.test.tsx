import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostPlayersPanel } from './HostPlayersPanel'

describe('HostPlayersPanel', () => {
  it('shows a felt to select a seated player and an alphabetical list', () => {
    const html = renderToStaticMarkup(
      createElement(HostPlayersPanel, {
        roster: [
          { playerId: 'human:b', name: 'Bo Kent', tableNum: 4 },
          { playerId: 'human:a', name: 'Ada Lane', tableNum: 2 },
        ],
        waiting: [{ id: 'human:c', name: 'Cara Moss' }],
        tables: [
          { tableNum: 2, seats: [{ name: 'Ada Lane', seatIndex: 0 }] },
          { tableNum: 4, seats: [{ name: 'Bo Kent', seatIndex: 3 }] },
        ],
        hostPlayerLabel: (name: string) => name,
        onRemove: () => {},
        onMove: () => {},
      }),
    )
    const felt = html.slice(html.indexOf('host-player-felt'), html.indexOf('host-player-index'))
    expect(felt).toContain('Select Ada Lane')
    expect(felt).not.toContain('Bo Kent')
    expect(html).toContain('Show table 4')
    const list = html.slice(html.indexOf('host-player-index'))
    const ada = list.indexOf('Ada Lane')
    const bo = list.indexOf('Bo Kent')
    const cara = list.indexOf('Cara Moss')
    expect(ada).toBeGreaterThan(-1)
    expect(bo).toBeGreaterThan(ada)
    expect(cara).toBeGreaterThan(bo)
    expect(list.slice(cara, cara + 240)).toContain('Waiting')
    expect(list).not.toContain('<select')
    expect(html).toContain('Select a player')
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
