import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostRoomControls } from './HostRoomControls'

describe('Host remove', () => {
  it('keeps re-seat in More and leaves player moves on the table', () => {
    const html = renderToStaticMarkup(
      createElement(HostRoomControls, {
        brief: {
          actionRows: [],
          moveLog: [],
          busts: [],
          bigWinners: [],
          bigBets: [],
          handBets: [],
          bigWinMinAmount: 300,
          fieldPlayerCount: 1,
          liveTableCount: 1,
          roster: [{ playerId: 'human:a', name: 'Ada Lane', tableNum: 2 }],
          venueHeld: false,
          shuffleEveryHands: 5,
          venueShuffleHeld: false,
          handsUntilShuffle: 4,
        },
        onShuffleEvery: () => {},
        onSkipNextShuffle: () => {},
        onShuffleNow: () => {},
      }),
    )
    expect(html).not.toContain('>Move<')
    expect(html).toContain('Re-seat now')
    expect(html).not.toContain('Shuffle')
    expect(html).not.toContain('Between hands')
  })
})
