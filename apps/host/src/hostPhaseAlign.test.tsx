import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueFeltBeatRow, HostVenueFloorBriefPayload } from '@qhe/net'
import { HostFeltPhasePicker, HostHandBetRank, HostTableOpen, HostVenueFloorBriefPanel } from './hostDeskLayout'

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

function floorBrief(): HostVenueFloorBriefPayload {
  return {
    actionRows: [1, 2].map((tableNum) => ({
      tableNum,
      phase: 'answering',
      seated: 3,
      pot: 0,
      actingSeatIndex: null,
      actingPlayerName: null,
      actingSummary: null,
      recentActions: [],
      inPotCount: 3,
      pointsOnlyCount: 0,
      seats: [],
    })),
    moveLog: [],
    busts: [],
    bigWinners: [],
    bigBets: [],
    handBets: [],
    bigWinMinAmount: 300,
    fieldPlayerCount: 6,
    liveTableCount: 2,
    roster: [],
    venueHeld: false,
    shuffleEveryHands: 5,
    venueShuffleHeld: false,
    handsUntilShuffle: 5,
  }
}

describe('Venue floor phase tools', () => {
  it('offers match the room on the floor when beats disagree', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floorBrief(),
        feltRows: [row(1, 'answering', 'answer'), row(2, 'showdown', 'postHand')],
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        onAlignRoom: () => {},
        onSetTablePhase: () => {},
      }),
    )
    expect(html).toContain('Venue floor')
    expect(html).toContain('Misaligned')
    expect(html).toContain('Match the room')
    expect(html).not.toContain('Venue felts')
  })

  it('puts phase choices on the opened table', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [],
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
        tableNum: 2,
        onSetTablePhase: () => {},
      }),
    )
    expect(html).toContain('Table 2')
    expect(html).toContain('Results')
  })

  it('shows the opened table on the TVs', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [],
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
        onSpotlight: () => {},
      }),
    )
    expect(html).toContain('Show on TVs')
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
