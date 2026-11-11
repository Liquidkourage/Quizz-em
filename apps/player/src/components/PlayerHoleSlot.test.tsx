import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type NumericCard, type PlayerState } from '@qhe/core'
import { PlayerHoleSlot } from './PlayerHoleSlot'

const holes = [{ digit: 7 }, { digit: 2 }] as NumericCard[]

function seated(hand: NumericCard[]): PlayerState {
  let gs = createEmptyGame('V', 'h', '7')
  gs = addPlayer(gs, 'me', 'You', 990)
  const player = gs.players[0]
  if (!player) throw new Error('missing player')
  return { ...player, hand }
}

describe('protected hole-card slot', () => {
  it('shows Hold to peek and both card backs while the hand is hidden', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerHoleSlot, { player: seated(holes), phase: 'betting' }),
    )
    expect(html).toContain('player-hole-slot')
    expect(html).toContain('Hold to peek')
    expect(html.match(/player-hole-peek-back/g)).toHaveLength(2)
    expect(html).not.toContain('digit-7')
    expect(html).not.toContain('digit-2')
  })

  it('stays empty once the hand is face up and when the player has no cards', () => {
    const revealed = renderToStaticMarkup(
      createElement(PlayerHoleSlot, { player: seated(holes), phase: 'reveal' }),
    )
    const showdown = renderToStaticMarkup(
      createElement(PlayerHoleSlot, { player: seated(holes), phase: 'showdown' }),
    )
    const undealt = renderToStaticMarkup(
      createElement(PlayerHoleSlot, { player: seated([]), phase: 'lobby' }),
    )
    const beforeCards = renderToStaticMarkup(
      createElement(PlayerHoleSlot, { player: seated([]), phase: 'question' }),
    )
    expect(revealed).toBe('')
    expect(showdown).toBe('')
    expect(undealt).toBe('')
    expect(beforeCards).toContain('player-hole-slot')
    expect(beforeCards).not.toContain('Hold to peek')
  })

  it('renders the slot after the clipping body, as a child of the shell', () => {
    const app = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../App.tsx'), 'utf8')
    const shellStart = app.indexOf('<PlayerGameShell>')
    const shellEnd = app.indexOf('</PlayerGameShell>')
    const shell = app.slice(shellStart, shellEnd)
    const bodyOpen = shell.indexOf('player-join-body player-game-body')
    const slotAt = shell.indexOf('<PlayerHoleSlot')
    expect(shellStart).toBeGreaterThan(-1)
    expect(bodyOpen).toBeGreaterThan(-1)
    expect(slotAt).toBeGreaterThan(bodyOpen)
    const beforeSlot = shell.slice(0, slotAt)
    const tail = beforeSlot.slice(beforeSlot.lastIndexOf('</div>'))
    expect(beforeSlot.lastIndexOf('</div>')).toBeGreaterThan(bodyOpen)
    expect(tail.includes('<div ')).toBe(false)
    expect(tail.includes('<div>')).toBe(false)
  })
})
