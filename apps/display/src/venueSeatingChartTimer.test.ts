import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'
import VenueSeatingChart from './VenueSeatingChart'

function tile(tableNum: number): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 2,
    pot: 0,
    phase: 'lobby',
    seatNames: [`Ann ${tableNum}`, `Bea ${tableNum}`, '', '', '', '', '', ''],
    seatBankrolls: [100, 100, 0, 0, 0, 0, 0, 0],
  }
}

function wall(): DisplayVenueWallSnapshot {
  return {
    tiles: [1, 2, 3, 4, 5, 6].map((n) => tile(n)),
    headlineQuestionText: null,
    answerDeadlineMs: null,
    lobbyPlayerCount: 0,
    totalSeatedAtTables: 12,
    showAudienceWelcome: false,
  }
}

describe('seating chart clocks', () => {
  it('shows a circle draining until the next page, without spelling the seconds', () => {
    const html = renderToStaticMarkup(createElement(VenueSeatingChart, { wall: wall(), skipMountIntro: true }))
    expect(html).not.toContain('>10s<')
    expect(html).not.toContain('>8s<')
    expect(html).toContain('seating-chart-clock-value')
    expect(html).toContain('animation-duration:10000ms')
    expect(html).toContain('animation-duration:8000ms')
  })
})
