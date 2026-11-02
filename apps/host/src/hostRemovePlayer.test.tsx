import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostRoomControls } from './HostRoomControls'

describe('Host remove', () => {
  it('offers remove for the selected seated player', () => {
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
        hostPlayerLabel: (name: string) => name,
        onMove: () => {},
        onRemove: () => {},
        onShuffleEvery: () => {},
        onSkipNextShuffle: () => {},
        onShuffleNow: () => {},
      }),
    )
    expect(html).toContain('Remove')
    expect(html).toContain('Re-seat now')
    expect(html).not.toContain('Shuffle')
    expect(html).not.toContain('Between hands')
  })
})
