import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { balancedPhysicalSeats } from '@qhe/core'
import { playerFeltRoster } from '../playerModel/playerFeltRoster'
import { rosterDisplayName } from '../playerModel/seatBettingStatus'

describe('phone felt roster', () => {
  it('leaves points-only players, including ghosts, off the felt without moving chip players', () => {
    const players = [
      { name: 'Ada Lane', pointsOnly: false, hasFolded: true },
      { name: 'Elena C.', pointsOnly: true },
      { name: 'Bo Kent', pointsOnly: false },
      { name: 'Cara Moss', pointsOnly: false },
      { name: 'Dee Park', pointsOnly: false },
      { name: 'Eve Shaw', pointsOnly: false },
      { name: 'Fay Orth', pointsOnly: false },
      { name: 'Jamal A.', pointsOnly: true, ghostHostId: 'ada' },
    ]
    const drawn = playerFeltRoster(players)
    const html = renderToStaticMarkup(
      createElement(
        'ul',
        null,
        drawn.map((seat) => createElement('li', { key: seat.rosterIndex }, rosterDisplayName(seat.player.name))),
      ),
    )
    expect(html).toContain('Ada L.')
    expect(html).toContain('Bo K.')
    expect(html).toContain('Fay O.')
    expect(html).not.toContain('Elena')
    expect(html).not.toContain('Jamal')
    expect(html).not.toContain('pts')
    expect(drawn.map((seat) => seat.chair)).toEqual([0, 2, 3, 4, 5, 6])
    expect(drawn.map((seat) => seat.chair)).not.toEqual(balancedPhysicalSeats(6))
  })
})
