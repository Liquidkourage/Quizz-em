import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'
import VenueLeaderboardWall from './VenueLeaderboardWall'
import VenueBustAnnouncement from './VenueBustAnnouncement'
import VenueAnswerRevealOverlay from './VenueAnswerRevealOverlay'
import { bustOverlayDurationMs } from './useVenueBustAnnouncement'
import { seatingOverlayDurationMs } from './useVenueSeatingAnnouncement'

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

function wall(tableCount: number): DisplayVenueWallSnapshot {
  return {
    tiles: Array.from({ length: tableCount }, (_, n) => tile(n + 1)),
    headlineQuestionText: null,
    answerDeadlineMs: null,
    lobbyPlayerCount: 0,
    totalSeatedAtTables: tableCount * 8,
    showAudienceWelcome: false,
  }
}

function outOfChipsWall(tableCount: number): DisplayVenueWallSnapshot {
  const base = wall(tableCount)
  return {
    ...base,
    tiles: base.tiles.map((entry) => ({
      ...entry,
      seatPointsOnly: entry.seatNames?.map((name) => name.trim().length > 0),
    })),
  }
}

describe('public screens that change on a timer', () => {
  it('shows the page circle on a leaderboard with more than one page', () => {
    const paged = renderToStaticMarkup(
      createElement(VenueLeaderboardWall, { wall: wall(9), skipMountIntro: true, trophyMode: 'chips' }),
    )
    expect(paged).toContain('seating-chart-clock-value')
    expect(paged).toContain('animation-duration:12000ms')

    const single = renderToStaticMarkup(
      createElement(VenueLeaderboardWall, { wall: wall(1), skipMountIntro: true, trophyMode: 'chips' }),
    )
    expect(single).not.toContain('seating-chart-clock-value')
  })

  it('keeps the trivia scores clock at the foot of the board', () => {
    const trivia = renderToStaticMarkup(
      createElement(VenueLeaderboardWall, { wall: outOfChipsWall(9), skipMountIntro: true, trophyMode: 'trivia' }),
    )
    expect(trivia).toContain('venue-lb-pager--trivia')
    expect(trivia).toContain('Best of the Rest')
    expect(trivia).not.toContain('Trivia brain')
    expect(trivia).not.toContain('Closest guesses')
    expect(trivia).not.toContain('venue-lb-logo-wrap')

    const chips = renderToStaticMarkup(
      createElement(VenueLeaderboardWall, { wall: wall(9), skipMountIntro: true, trophyMode: 'chips' }),
    )
    expect(chips).not.toContain('venue-lb-pager--trivia')
    expect(chips).toContain('Chip leaders')
    expect(chips).not.toContain('Chip stacks')
    expect(chips).not.toContain('venue-lb-logo-wrap')
  })

  it('shows the circle while chip and trivia scores trade places', () => {
    const html = renderToStaticMarkup(
      createElement(VenueLeaderboardWall, { wall: wall(1), skipMountIntro: true, trophyMode: 'dual' }),
    )
    expect(html).toContain('seating-chart-clock-value')
    expect(html).toContain('animation-duration:12000ms')
  })

  it('shows the circle on a timed elimination card and the answer card', () => {
    const busts = renderToStaticMarkup(
      createElement(VenueBustAnnouncement, {
        busts: [{ name: 'Ada Lane', tableNum: 2 }],
        timed: true,
      }),
    )
    expect(busts).toContain('animation-duration:4600ms')

    const held = renderToStaticMarkup(
      createElement(VenueBustAnnouncement, {
        busts: [{ name: 'Ada Lane', tableNum: 2 }],
      }),
    )
    expect(held).not.toContain('seating-chart-clock-value')

    const answer = renderToStaticMarkup(
      createElement(VenueAnswerRevealOverlay, {
        payload: { question: 'How many?', answer: 42 },
      }),
    )
    expect(answer).toContain('animation-duration:5000ms')
  })

  it('keeps elimination and seating cards up for the shorter dwell', () => {
    expect(bustOverlayDurationMs(1, false)).toBe(4600)
    expect(bustOverlayDurationMs(3, false)).toBe(5880)
    expect(bustOverlayDurationMs(20, false)).toBe(10000)
    expect(
      seatingOverlayDurationMs(
        {
          shuffled: true,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [],
          closedTableNums: [],
        },
        false,
      ),
    ).toBe(6800)
    expect(
      seatingOverlayDurationMs(
        {
          shuffled: true,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [],
          closedTableNums: [],
        },
        true,
      ),
    ).toBe(4300)
  })
})
