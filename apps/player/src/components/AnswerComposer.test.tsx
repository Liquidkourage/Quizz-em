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
    const hole = html.slice(html.indexOf('Hole cards'), html.indexOf('Board'))
    const street = html.slice(html.indexOf('>Board<'), html.indexOf('Keys'))
    expect(hole.indexOf('Card 7')).toBeGreaterThanOrEqual(0)
    expect(hole.indexOf('Card 7')).toBeLessThan(hole.indexOf('Card 9'))
    let at = 0
    for (const digit of [0, 1, 3, 5, 9]) {
      const next = street.indexOf(`Card ${digit}`, at)
      expect(next).toBeGreaterThanOrEqual(0)
      at = next + 1
    }
  })

  it('puts the hole cards and the board on one line', () => {
    const gs = answering()
    gs.round.communityCards = [{ digit: 1 }, { digit: 2 }, { digit: 3 }, { digit: 4 }, { digit: 5 }] as NumericCard[]
    const player = { ...gs.players[0]!, hand: [{ digit: 8 }, { digit: 9 }] as NumericCard[] }
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
    const lineAt = html.indexOf('player-game-card-line')
    const keysAt = html.indexOf('>Keys<')
    expect(lineAt).toBeGreaterThan(-1)
    expect(keysAt).toBeGreaterThan(lineAt)
    const line = html.slice(lineAt, keysAt)
    expect(line).toContain('Hole cards')
    expect(line).toContain('>Board<')
    expect(line).not.toContain('>Keys<')

    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const mark = 'Answer cards share one line.'
    const block = css.slice(css.indexOf(mark), css.indexOf(mark) + 900)
    expect(block.startsWith(mark)).toBe(true)
    expect(block).toContain('flex-wrap: nowrap')
    expect(block).toContain('/ 7')
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
  it('shrinks the clock so the cards stay on the glass', () => {
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const mark = 'Short answer screen: the cards stay on the glass.'
    const block = css.slice(css.indexOf(mark), css.indexOf(mark) + 2200)
    expect(block.startsWith(mark)).toBe(true)
    expect(block).toContain('@media (max-height: 520px)')
    expect(block).toContain('height: 2.75rem !important')
    expect(block).toContain('.player-game-card-line')
    expect(block).toContain('width: auto')
    expect(block).toContain('.player-game-timer strong')
    expect(block).toContain('font-size: 1.35rem')
  })
})
