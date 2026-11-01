import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { HostFeltPhasePicker, HostHandBetRank, HostVenueFeltBeatStrip } from './hostDeskLayout'

function row(tableNum: number, phase: string, sig: string): HostVenueFeltBeatRow {
  return {
    tableNum,
    active: true,
    seated: 3,
    phase,
    street: '',
    clock: '',
    answerDeadlineMs: null,
    phaseStrictSig: sig,
  }
}

describe('Venue felts beat phase tools', () => {
  it('lets the host click a seated table and match the room when beats disagree', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFeltBeatStrip, {
        rows: [row(1, 'answering', 'answer'), row(2, 'showdown', 'postHand')],
        hostTableId: '1',
        onAlignRoom: () => {},
        onSetTablePhase: () => {},
      }),
    )
    expect(html).toContain('Venue felts · beat')
    expect(html).toContain('Open')
    expect(html).toContain('Misaligned')
    expect(html).not.toContain('Match the room')
    expect(html).not.toContain('Click a table to set its phase')
    expect(html).not.toContain('aria-label="Table 1"')
  })

  it('lists beats for the table that was clicked', () => {
    const html = renderToStaticMarkup(
      createElement(HostFeltPhasePicker, {
        tableNum: 2,
        onPick: () => {},
      }),
    )
    expect(html).toContain('Table 2')
    expect(html).toContain('Guessing')
    expect(html).toContain('Results')
  })

  it('lists this hand’s bets largest first', () => {
    const html = renderToStaticMarkup(
      createElement(HostHandBetRank, {
        title: 'Big bets this hand',
        bets: [
          {
            name: 'Ada L.',
            tableNum: 3,
            amount: 500,
            kind: 'raise',
            atMs: 2,
          },
          {
            name: 'Bo K.',
            tableNum: 1,
            amount: 80,
            kind: 'call',
            atMs: 1,
          },
        ],
      }),
    )
    expect(html.indexOf('Ada L.')).toBeLessThan(html.indexOf('Bo K.'))
    expect(html).toContain('Big bets this hand')
    expect(html).toContain('Raise')
  })
})
