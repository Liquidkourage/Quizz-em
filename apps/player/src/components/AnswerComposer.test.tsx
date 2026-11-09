import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type GameState, type NumericCard } from '@qhe/core'
import { EMPTY_COMPOSED_ANSWER } from '../playerModel/answerComposition'
import AnswerComposer from './AnswerComposer'

function answering(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'a', 'Ada', 1000)
  return {
    ...gs,
    phase: 'answering',
    round: { ...gs.round, question: { id: 'q', text: 'How many?', answer: 4 } },
  }
}

describe('answer composer cards', () => {
  it('shows the hole cards low to high and the street low to high', () => {
    const gs = answering()
    gs.round.communityCards = [
      { digit: 5 },
      { digit: 1 },
      { digit: 0 },
      { digit: 3 },
      { digit: 9 },
    ] as NumericCard[]
    const player = {
      ...gs.players[0]!,
      hand: [{ digit: 9 }, { digit: 7 }] as NumericCard[],
    }
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: player,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 30,
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
      }),
    )
    const hole = html.slice(html.indexOf('Your cards'), html.indexOf('Shared cards'))
    const street = html.slice(html.indexOf('Shared cards'), html.indexOf('player-compose-tools'))
    expect(hole.indexOf('Card 7')).toBeGreaterThanOrEqual(0)
    expect(hole.indexOf('Card 7')).toBeLessThan(hole.indexOf('Card 9'))
    let at = 0
    for (const digit of [0, 1, 3, 5, 9]) {
      const next = street.indexOf(`Card ${digit}`, at)
      expect(next).toBeGreaterThanOrEqual(0)
      at = next + 1
    }
  })

  it('fills five answer places from the cards in tap order', () => {
    const gs = answering()
    gs.round.communityCards = [{ digit: 1 }, { digit: 2 }, { digit: 3 }, { digit: 4 }, { digit: 5 }] as NumericCard[]
    const player = { ...gs.players[0]!, hand: [{ digit: 8 }, { digit: 9 }] as NumericCard[] }
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: player,
        composed: { digits: [8, 'decimal', 1], display: '8.1', value: 8.1 },
        selectedCards: [
          { type: 'hand', index: 0 },
          { type: 'community', index: 0 },
        ],
        remainingSec: 30,
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
      }),
    )
    expect(html).toContain('How many?')
    const rail = html.slice(html.indexOf('player-compose-rail'), html.indexOf('Your cards'))
    expect(rail.indexOf('>8<')).toBeGreaterThanOrEqual(0)
    expect(rail.indexOf('player-compose-dot')).toBeGreaterThan(rail.indexOf('>8<'))
    expect(rail.indexOf('>1<')).toBeGreaterThan(rail.indexOf('player-compose-dot'))
    expect(rail.match(/player-compose-slot--filled/g)).toHaveLength(2)
    expect(rail.match(/player-compose-slot--empty/g)).toHaveLength(3)
    expect(html).toContain('aria-label="Decimal point"')
    expect(html).toContain('aria-label="Backspace"')
    expect(html).toContain('Clear')
    expect(html).toContain('Submit answer')
  })
})

describe('answer composer clock', () => {
  it('says time is up without inviting another edit', () => {
    const gs = answering()
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: gs.players[0]!,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 0,
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
      }),
    )
    expect(html).toContain('Time is up')
    expect(html).not.toContain('keep editing')
    expect(html).not.toContain('host reveals')
    expect(html).not.toContain('player-game-timer--urgent')
  })

  it('keeps a locked answer settled once the clock has finished', () => {
    const gs = answering()
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: gs.players[0]!,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 0,
        submittedDisplay: '42',
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
        onEditSubmitted: () => {},
      }),
    )
    expect(html).toContain('Locked in.')
    expect(html).not.toContain('before time runs out')
    expect(html).not.toContain('keep editing')
  })

  it('keeps the shared answer window and the edit control while time is left', () => {
    const gs = answering()
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: gs.players[0]!,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 22,
        submittedDisplay: '42',
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
        onEditSubmitted: () => {},
      }),
    )
    expect(html).toContain('Time')
    expect(html).toContain('22')
    expect(html).toContain('Edit answer')
    expect(html).not.toContain('Lock a guess')
  })

  it('shows the nudge countdown only beside an unlocked guess', () => {
    const gs = answering()
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: gs.players[0]!,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 40,
        nudgeRemainingSec: 12,
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
      }),
    )
    expect(html).toContain('>40<')
    expect(html).toContain('Lock a guess')
    expect(html).toContain('>12<')
  })
})

describe('answer composer on a short screen', () => {
  it('keeps answer controls at a finger size, including a short landscape phone', () => {
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const mark = 'Answer builder keeps a finger-sized control.'
    const block = css.slice(css.indexOf(mark), css.indexOf(mark) + 8000)
    expect(block.startsWith(mark)).toBe(true)
    expect(block).toContain('min-width: 2.75rem')
    expect(block).toContain('min-height: 2.75rem')
    expect(block).toContain('@media (orientation: landscape) and (max-height: 520px)')
    expect(block).not.toContain('width: 2.15rem')
  })
})
