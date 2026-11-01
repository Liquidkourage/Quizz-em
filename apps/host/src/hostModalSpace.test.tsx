import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { HostFeltPhasePicker, HostFloorStrip, HostTvBar, HostVenueFeltBeatStrip } from './hostDeskLayout'
import { HostModal } from './HostModal'

function felt(tableNum: number): HostVenueFeltBeatRow {
  return {
    tableNum,
    active: true,
    seated: 2,
    phase: 'betting',
    street: 'preflop',
    clock: '',
    answerDeadlineMs: null,
    phaseStrictSig: 'betting',
  }
}

describe('host popup space', () => {
  it('opens a dialog that fills the vertical space', () => {
    const html = renderToStaticMarkup(
      createElement(HostModal, { title: 'Tables', open: true, onClose: () => {}, children: createElement('p', null, 'Tables') }),
    )
    expect(html).toContain(' h-[min(86vh,48rem)] ')
    expect(html).toContain('flex-1')
  })

  it('wraps table chips down the dialog instead of one scrolling row', () => {
    const html = renderToStaticMarkup(
      createElement(HostFloorStrip, {
        rows: [felt(1), felt(2), felt(3)],
        brief: null,
        onSpotlight: () => {},
      }),
    )
    expect(html).toContain('grid-cols-2')
    expect(html).toContain('auto-rows-[minmax(5.5rem,1fr)]')
    expect(html).not.toContain('overflow-x-auto')
  })

  it('lays audience TV modes as separate buttons and marks the active one', () => {
    const html = renderToStaticMarkup(
      createElement(HostTvBar, {
        activeView: 'seating-chart',
        onVenueFloor: () => {},
        onLeaderboard: () => {},
        onTriviaLeaderboard: () => {},
        onSeatingChart: () => {},
        onEliminations: () => {},
        onSeatingRules: () => {},
      }),
    )
    expect(html).toContain('host-tv-modes')
    expect(html).toContain('flex-nowrap')
    expect(html).not.toContain('flex-wrap')
    expect(html).toContain('Seating')
    expect(html).toMatch(/host-tv-mode-active[^>]*>Seating/)
    expect(html).not.toContain('grid-cols-1')
  })

  it('lays venue felts in growing rows', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFeltBeatStrip, {
        rows: [felt(1), felt(2), felt(3), felt(4)],
        hostTableId: '1',
        onSetTablePhase: () => {},
        forceOpen: true,
      }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('grid-cols-2')
    expect(html).toContain('auto-rows-[minmax(6.5rem,1fr)]')
    expect(html).not.toContain('lg:grid-cols-10')
  })

  it('lists phase choices in rows', () => {
    const html = renderToStaticMarkup(
      createElement(HostFeltPhasePicker, { tableNum: 2, onPick: () => {} }),
    )
    expect(html).toContain('grid-cols-2')
    expect(html).not.toContain('flex-wrap')
  })
})
