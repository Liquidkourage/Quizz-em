import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEmptyGame, type PlayerState } from '@qhe/core'
import { HostContestRoster } from './hostDeskLayout'

function player(partial: Pick<PlayerState, 'id' | 'name' | 'hasFolded' | 'pointsOnly'>): PlayerState {
  return {
    bankroll: 1000,
    hand: [],
    isAllIn: false,
    ...partial,
  }
}

describe('contest status', () => {
  it('splits the table into an in-pot column and a points-only column', () => {
    const gameState = createEmptyGame('HOST01', 'host', '1')
    gameState.phase = 'betting'
    gameState.players = [
      player({ id: 'a', name: 'Ada L.', hasFolded: false, pointsOnly: false }),
      player({ id: 'b', name: 'Bo K.', hasFolded: true, pointsOnly: false }),
    ]
    const html = renderToStaticMarkup(
      createElement(HostContestRoster, {
        gameState,
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(html).toContain('grid-cols-2')
    expect(html).not.toContain('flex flex-wrap')
    expect(html.indexOf('Ada L.')).toBeGreaterThan(html.indexOf('In pot'))
    expect(html.indexOf('Bo K.')).toBeGreaterThan(html.indexOf('Points only'))
    expect(html.indexOf('In pot')).toBeLessThan(html.indexOf('Points only'))
  })
})
