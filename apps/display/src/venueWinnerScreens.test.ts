import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WINNER_SCREEN_DWELL_MS } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { VenueWinnerScreenFrame } from './VenueWinnerScreens'

function tile(tableNum: number, name: string): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 1,
    pot: 200,
    phase: 'showdown',
    seatNames: [name],
    seatFolded: [false],
    seatSubmittedAnswers: [10],
    seatChipPayout: [200],
    showdownAnswer: 10,
  }
}

describe('winner screens', () => {
  it('shows one table for a full screen dwell', () => {
    const html = renderToStaticMarkup(
      createElement(VenueWinnerScreenFrame, {
        tile: tile(2, 'Ada Lane'),
        pageIndex: 0,
        pageCount: 3,
        dwellMs: WINNER_SCREEN_DWELL_MS,
      }),
    )
    expect(html).toContain('Winners, screen 1 of 3, table 2')
    expect(html).toContain('Ada Lane')
    expect(html).toContain(`animation-duration:${WINNER_SCREEN_DWELL_MS}ms`)
    expect(html).not.toContain('Ned')
  })
})
