import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableIntroduction } from './TableIntroduction'

const players = [
  { id: 'a', name: 'Devon B.', bankroll: 980 },
  { id: 'me', name: 'Alice Chen', bankroll: 1000 },
  { id: 'c', name: 'Sam', bankroll: 980 },
]

function markup(revealedCount: number): string {
  return renderToStaticMarkup(
    createElement(TableIntroduction, {
      players,
      heroId: 'me',
      tableId: '1',
      smallBlind: 10,
      bigBlind: 20,
      revealedCount,
    }),
  )
}

describe('TableIntroduction', () => {
  it('opens on the empty table', () => {
    const html = markup(0)
    expect(html).toContain('Table 1')
    expect(html).toContain('Waiting for the host to deal')
    expect(html).not.toContain('Devon')
    expect(html).not.toContain('Alice')
    expect(html).not.toContain('>You<')
  })

  it('brings the other players in before you, then names the whole table', () => {
    const first = markup(1)
    expect(first).toContain('Devon B.')
    expect(first).not.toContain('Alice')
    expect(first).not.toContain('player-intro-plate--you')

    const done = markup(3)
    expect(done).toContain('player-intro-plate--you')
    expect(done).toContain('>You<')
    expect(done).toContain('Alice C.')
    expect(done).toContain('3 players. The host will deal when ready.')
  })
})
