import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'
import VenueLeaderboardWall from './VenueLeaderboardWall'

function tile(tableNum: number): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 8,
    pot: 0,
    phase: 'lobby',
    seatNames: Array.from({ length: 8 }, (_, seat) => `Player ${tableNum}-${seat}`),
    seatBankrolls: Array.from({ length: 8 }, (_, seat) => 1000 - seat),
  }
}

function wall(): DisplayVenueWallSnapshot {
  return {
    tiles: [tile(1)],
    headlineQuestionText: null,
    answerDeadlineMs: null,
    lobbyPlayerCount: 0,
    totalSeatedAtTables: 8,
    showAudienceWelcome: false,
    venueChipSurvivorCount: 8,
    venueLiveTableCount: 1,
  }
}

describe('chip leaders chrome', () => {
  it('keeps the list, and mentions the median and the table count quietly', () => {
    const html = renderToStaticMarkup(
      createElement(VenueLeaderboardWall, { wall: wall(), skipMountIntro: true, trophyMode: 'chips' }),
    )
    expect(html).toContain('Chip leaders')
    expect(html).toContain('Median')
    expect(html).toContain('1 table')
    expect(html).not.toContain('remaining')
    expect(html).not.toContain('Top stack')
    expect(html).not.toContain('venue-lb-ribbon')
    expect(html).not.toContain('venue-lb-stat-icon')
  })
})
