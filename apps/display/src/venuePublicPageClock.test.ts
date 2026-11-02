import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'
import VenueLeaderboardWall from './VenueLeaderboardWall'
import VenueBustAnnouncement from './VenueBustAnnouncement'
import VenueAnswerRevealOverlay from './VenueAnswerRevealOverlay'

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
    expect(busts).toContain('animation-duration:6500ms')

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
    expect(answer).toContain('animation-duration:7000ms')
  })
})
