import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type GameState, type NumericCard } from '@qhe/core'
import TableFeltView from './TableFeltView'

const holes = [{ digit: 7 }, { digit: 9 }] as NumericCard[]

function felt(pointsOnly: boolean): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'me', 'Joy', 0)
  gs = addPlayer(gs, 'kim', 'Kim', 1000)
  return {
    ...gs,
    phase: 'betting',
    players: gs.players.map((player) =>
      player.id === 'me' ? { ...player, pointsOnly, bankroll: 0, hand: holes } : player,
    ),
  }
}

describe('points-only hole cards', () => {
  it('shows a busted player their own cards under the felt', () => {
    const html = renderToStaticMarkup(
      createElement(TableFeltView, { gameState: felt(true), playerName: 'Joy', myPlayerId: 'me' }),
    )
    expect(html).toContain('Hold to peek')
    expect(html).not.toContain('Card 7')
    expect(html).not.toContain('Card 9')
    expect(html).not.toContain('digit-7')
    expect(html).not.toContain('Your cards · folded')
  })

  it('places Hold to peek after the felt panel so the panel cannot clip it', () => {
    const html = renderToStaticMarkup(
      createElement(TableFeltView, {
        gameState: felt(false),
        playerName: 'Joy',
        myPlayerId: 'me',
        fillViewport: true,
      }),
    )
    const stackAt = html.indexOf('player-felt-stack')
    expect(stackAt).toBeGreaterThan(-1)
    expect(html.indexOf('Hold to peek')).toBeGreaterThan(html.lastIndexOf('</section>'))
    expect(html.indexOf('player-hole-peek')).toBeGreaterThan(html.indexOf('player-felt-stack'))
  })

  it('leaves a chip player’s cards on the seat', () => {
    const html = renderToStaticMarkup(
      createElement(TableFeltView, { gameState: felt(false), playerName: 'Joy', myPlayerId: 'me' }),
    )
    expect(html).toContain('Hold to peek')
    expect(html).not.toContain('digit-7')
    expect(html).not.toContain('player-hud-hero-cards')
  })
})
