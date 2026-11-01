import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow, HostVenueFloorBriefPayload } from '@qhe/net'
import { HostTableContest, HostVenueFloorBriefPanel } from './hostDeskLayout'

function actionRow(tableNum: number): HostVenueActionRow {
  return {
    tableNum,
    phase: 'lobby',
    seated: 4,
    pot: 0,
    actingSeatIndex: null,
    actingPlayerName: null,
    actingSummary: null,
    recentActions: [],
    inPotCount: 4,
    pointsOnlyCount: 0,
    seats: [],
  }
}

function brief(): HostVenueFloorBriefPayload {
  return {
    actionRows: [1, 2, 3, 4].map((n) =>
      n === 1
        ? {
            ...actionRow(n),
            seats: [{ name: 'Ada L.', kind: 'pot' as const, reason: null }],
          }
        : actionRow(n),
    ),
    moveLog: [],
    busts: [],
    bigWinners: [],
    bigBets: [],
    handBets: [],
    bigWinMinAmount: 300,
    fieldPlayerCount: 16,
    liveTableCount: 4,
    roster: [],
    venueHeld: false,
    shuffleEveryHands: 5,
    venueShuffleHeld: false,
    handsUntilShuffle: 5,
  }
}

describe('venue floor now', () => {
  it('lays tables across the width and keeps the notes in one strip', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: brief(),
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const tables = html.indexOf('T1')
    const busts = html.indexOf('Busts')
    expect(html).not.toContain('h-full')
    expect(html).not.toContain('flex-1')
    expect(html).toContain('minmax(7.5rem,9rem)')
    expect(html).toContain('px-1.5 py-1')
    expect(html).not.toContain('lg:grid-cols-4')
    expect(html).toContain('sm:grid-cols-3')
    expect(html).not.toContain('grid grid-cols-2 gap-3')
    expect(tables).toBeGreaterThan(-1)
    expect(html).toContain('This hand')
    expect(html).toContain('None this hand.')
    expect(html.indexOf('This hand')).toBeGreaterThan(html.indexOf('Venue floor'))
    expect(busts).toBeGreaterThan(html.indexOf('This hand'))
    expect(html).toContain('Open table 1')
    expect(html).not.toContain('Ada L.')
  })

  it('opens a table into in-pot and points-only columns', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableContest, {
        seats: [
          { name: 'Ada L.', kind: 'pot', reason: null },
          { name: 'Bo K.', kind: 'points', reason: 'folded' },
        ],
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(html).toContain('grid-cols-2')
    expect(html.indexOf('Ada L.')).toBeGreaterThan(html.indexOf('In pot'))
    expect(html.indexOf('Bo K.')).toBeGreaterThan(html.indexOf('Points only'))
    expect(html).toContain('Folded')
  })
})
