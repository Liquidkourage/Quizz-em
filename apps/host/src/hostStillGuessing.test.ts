import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow, HostVenueFeltBeatRow } from '@qhe/net'
import HostStillGuessingNotice from './HostStillGuessingNotice'
import { playersStillGuessing } from './hostStillGuessing'

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

function felt(tableNum: number, answerDeadlineMs: number | null): HostVenueFeltBeatRow {
  return {
    tableNum,
    active: true,
    seated: 2,
    phase: 'answering',
    street: 'answer',
    clock: '',
    answerDeadlineMs,
    phaseStrictSig: 'answer',
  }
}

describe('players still guessing after the clock', () => {
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

  it('stays quiet until the answer clock hits 0', () => {
    expect(playersStillGuessing(rows, [felt(2, 10_000), felt(4, 10_000)], 9_000)).toEqual([])
  })

  it('lists who has not submitted, then drops a name when that guess locks', () => {
    expect(playersStillGuessing(rows, [felt(2, 10_000), felt(4, 10_000)], 10_000)).toEqual([
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
    expect(playersStillGuessing(afterBo, [felt(2, 10_000), felt(4, 10_000)], 10_500)).toEqual([
      { name: 'Cy', tableNum: 4 },
    ])
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
    expect(html).toContain('Nudge')
    expect(html).toContain('scores 0')
    expect(html).toContain('cannot win the pot')
  })
})
