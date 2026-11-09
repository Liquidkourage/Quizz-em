import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type GameState, type NumericCard } from '@qhe/core'
import PlayerBettingTable from './PlayerBettingTable'

function hand(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'a', 'Ada', 0)
  gs = addPlayer(gs, 'b', 'Bo', 800)
  gs = addPlayer(gs, 'c', 'Cara', 1000)
  return {
    ...gs,
    tableId: '1',
    phase: 'betting',
    players: gs.players.map((player) => {
      if (player.id === 'a') return { ...player, isAllIn: true, bankroll: 0 }
      if (player.id === 'b') return { ...player, hasFolded: true }
      return player
    }),
    round: {
      ...gs.round,
      isBettingOpen: true,
      currentPlayerIndex: 2,
      pot: 850,
      handContributions: { a: 100, b: 500, c: 250 },
      communityCards: [{ digit: 9 }, { digit: 1 }, { digit: 4 }, { digit: 3 }, { digit: 2 }] as NumericCard[],
      question: { id: 'q', text: 'How many?', answer: 4 },
    },
  }
}

function renderTable(open = false) {
  return renderToStaticMarkup(createElement(PlayerBettingTable, { gameState: hand(), myIndex: 0, open }))
}

describe('betting table', () => {
  it('leads with the pot and whose turn it is, and does not invent a side pot before an all-in', () => {
    const quiet = hand()
    quiet.players = quiet.players.map((player) => ({ ...player, isAllIn: false, hasFolded: false, bankroll: 1000 }))
    const html = renderToStaticMarkup(createElement(PlayerBettingTable, { gameState: quiet, myIndex: 0 }))
    expect(html).not.toContain('>Side<')
    expect(html).toContain('See the table')
    expect(html).toContain('aria-expanded="false"')
  })

  it('lists every seat, the real side pot, and the shared cards', () => {
    const html = renderTable(false)
    expect(html).toContain('You are all-in')
    expect(html).toContain('Cara to act')
    expect(html).not.toContain('You folded')
    expect(html).toContain('>Main<')
    expect(html).toContain('>Side<')
    const ada = html.slice(html.indexOf('>Ada<'), html.indexOf('>Bo<'))
    const bo = html.slice(html.indexOf('>Bo<'), html.indexOf('>Cara<'))
    const cara = html.slice(html.indexOf('>Cara<'))
    expect(ada).toContain('You')
    expect(ada).toContain('All-in')
    expect(bo).toContain('Folded')
    expect(cara).toContain('To act')
    expect(html).toContain('Card 1')
    expect(html.indexOf('Card 1')).toBeLessThan(html.indexOf('Card 2'))
    expect(html).not.toContain('player-game-felt')
  })

  it('opens the roster without removing it from the page', () => {
    const html = renderTable(true)
    expect(html).toContain('player-betting-table is-open')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('Hide the table')
  })

  it('keeps seat names readable and shows the roster beside the bet on a large screen', () => {
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const mark = 'Betting table keeps a readable roster.'
    const block = css.slice(css.indexOf(mark), css.indexOf(mark) + 1800)
    expect(block.startsWith(mark)).toBe(true)
    expect(block).toContain('font-size: 1rem')
    expect(block).toContain('min-height: 2.75rem')
    expect(block).toContain('@media (min-width: 1024px) and (min-height: 700px)')
    expect(block).not.toContain('font-size: 0.48rem')
  })
})
