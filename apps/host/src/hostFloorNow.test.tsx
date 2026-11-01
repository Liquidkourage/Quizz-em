import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow, HostVenueFloorBriefPayload } from '@qhe/net'
import { HostTableContest, HostTableOpen, HostVenueFloorBriefPanel } from './hostDeskLayout'

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
            pot: 1020,
            actingSummary: 'Answering on phones',
            pointsOnlyCount: 1,
            seats: [{ name: 'Ada L.', kind: 'pot' as const, reason: null }],
            recentActions: [{ seat: 0, name: 'Ned P.', action: 'call' as const }],
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
    expect(html).toContain('text-base font-bold text-white/90')
    expect(html).toContain('text-base text-white/50')
    expect(html).toContain('px-1.5 py-1')
    expect(html).not.toContain('lg:grid-cols-4')
    expect(html).toContain('sm:grid-cols-3')
    expect(html).not.toContain('grid grid-cols-2 gap-3')
    expect(tables).toBeGreaterThan(-1)
    expect(html).toContain('This hand')
    expect(html).not.toContain('acting')
    expect(html).not.toContain('busts, big bets')
    expect(html).toContain('None this hand.')
    expect(html.indexOf('This hand')).toBeGreaterThan(html.indexOf('Venue floor'))
    expect(busts).toBeGreaterThan(html.indexOf('This hand'))
    expect(html).toContain('Open table 1')
    expect(html).toContain('4 in pot')
    expect(html).toContain('1 out')
    expect(html).not.toContain('>Open<')
    expect(html).not.toContain('points only')
    expect(html).not.toContain('Answering on phones')
    expect(html).not.toContain('1,020')
    expect(html).not.toContain('Ada L.')
    expect(html).not.toContain('Ned P.')
    expect(html).not.toContain('>You<')
    expect(html).not.toContain('>Focus<')
    expect(html).not.toContain('ring-emerald-400/50')
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

  it('puts recent actions on the opened table', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [],
        recentActions: [{ seat: 1, name: 'Ned P.', action: 'call' }],
        phaseLabel: 'Guessing',
        pot: 1020,
        actingSummary: 'Answering on phones',
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(html).toContain('Ned P.')
    expect(html).toContain('Call')
    expect(html).toContain('Answering on phones')
    expect(html).toContain('1,020')
  })

  it('marks a table only when it is the whole public display', () => {
    const one = brief()
    one.liveTableCount = 1
    one.actionRows = [{ ...actionRow(3), seated: 4 }]
    one.wallView = 'floor'
    const alone = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: one,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    expect(alone).toContain('>Focus<')
    expect(alone).toContain('ring-sky-300/70')
    expect(alone.indexOf('>Focus<')).toBeGreaterThan(alone.indexOf('T3'))
    expect(alone.indexOf('>Focus<')).toBeLessThan(alone.indexOf('T3') + 400)

    one.wallView = 'leaderboard'
    const scores = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: one,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '3',
      }),
    )
    expect(scores).not.toContain('>Focus<')
  })

  it('keeps the blind call on the floor', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: brief(),
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        blindCall: createElement('p', null, 'Raise the blinds'),
      }),
    )
    expect(html).toMatch(/host-floor-toolbar[\s\S]*Raise the blinds/)
    expect(html.indexOf('host-floor-toolbar')).toBeLessThan(html.indexOf('Table action'))
  })
})
