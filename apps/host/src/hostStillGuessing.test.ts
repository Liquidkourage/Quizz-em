import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow } from '@qhe/net'
import HostStillGuessingNotice from './HostStillGuessingNotice'
import { guessClockCatchUp, playersStillGuessing } from './hostStillGuessing'

function row(partial: Partial<HostVenueActionRow> & Pick<HostVenueActionRow, 'tableNum' | 'seats'>): HostVenueActionRow {
  return {
    phase: 'answering',
    seated: partial.seats.length,
    pot: 0,
    actingSeatIndex: null,
    actingPlayerName: null,
    actingSummary: null,
    recentActions: [],
    inPotCount: partial.seats.length,
    pointsOnlyCount: 0,
    ...partial,
  }
}

describe('players still guessing', () => {
  const rows = [
    row({
      tableNum: 2,
      seats: [
        { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
        { name: 'Bo', kind: 'pot', reason: null, guessLocked: false },
      ],
    }),
    row({
      tableNum: 4,
      seats: [{ name: 'Cy', kind: 'points', reason: 'folded', guessLocked: false }],
    }),
  ]

  it('stays quiet while any table is still betting', () => {
    const mixed = [
      rows[0]!,
      row({
        tableNum: 3,
        phase: 'betting',
        seats: [{ name: 'Dee', kind: 'pot', reason: null }],
      }),
    ]
    expect(playersStillGuessing(mixed)).toEqual([])
  })

  it('lists who has not locked while the answer window is still open', () => {
    expect(playersStillGuessing(rows)).toEqual([
      { name: 'Bo', tableNum: 2 },
      { name: 'Cy', tableNum: 4 },
    ])
  })

  it('lists who has not submitted, then drops a name when that guess locks', () => {
    expect(playersStillGuessing(rows)).toEqual([
      { name: 'Bo', tableNum: 2 },
      { name: 'Cy', tableNum: 4 },
    ])
    const afterBo = [
      row({
        tableNum: 2,
        seats: [
          { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
          { name: 'Bo', kind: 'pot', reason: null, guessLocked: true },
        ],
      }),
      rows[1]!,
    ]
    expect(playersStillGuessing(afterBo)).toEqual([
      { name: 'Cy', tableNum: 4 },
    ])
  })
})

describe('guess clock catch-up', () => {
  it('moves the desk clock to now when the answer deadline is already past', () => {
    expect(guessClockCatchUp([10_000], 10_500, 9_000)).toBe(10_500)
  })

  it('leaves the desk clock alone while the answer window is still open', () => {
    expect(guessClockCatchUp([10_000], 9_000, 8_000)).toBeNull()
  })

  it('leaves the desk clock alone once it has already passed the deadline', () => {
    expect(guessClockCatchUp([10_000], 10_500, 10_500)).toBeNull()
  })
})

describe('still guessing notice', () => {
  it('shows the players who have not submitted', () => {
    const html = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        players: [
          { name: 'Bo', tableNum: 2 },
          { name: 'Cy', tableNum: 4 },
        ],
      }),
    )
    expect(html).toContain('Still guessing')
    expect(html).toContain('Bo')
    expect(html).toContain('Table 2')
    expect(html).toContain('Cy')
    expect(html).toContain('fixed')
    expect(html).not.toContain('max-h-64')
    expect(html).not.toContain('grid-cols-2')
    expect(html).toContain('Nudge')
    expect(html).toContain('scores 0')
    expect(html).toContain('cannot win the pot')
  })

  it('uses two columns when many players are still guessing', () => {
    const players = Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i}`, tableNum: i + 1 }))
    const html = renderToStaticMarkup(createElement(HostStillGuessingNotice, { players }))
    expect(html).toContain('grid-cols-2')
    expect(html).toContain('Player 7')
    expect(html).not.toContain('max-h-64')
  })
})
