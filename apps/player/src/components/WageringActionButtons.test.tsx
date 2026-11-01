import { addPlayer, createEmptyGame } from '@qhe/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { BettingContext } from '../playerModel/bettingModel'
import WageringActionButtons from './WageringActionButtons'

const noop = () => {}

function ctx(overrides: Partial<BettingContext> = {}): BettingContext {
  return {
    isBettingPhase: true,
    isBettingOpen: true,
    isMyTurn: true,
    myContribution: 0,
    currentBet: 20,
    toCall: 20,
    minRaise: 20,
    isOpeningBet: false,
    canBet: true,
    canCheck: false,
    canCall: true,
    canRaise: true,
    canAllIn: true,
    canFold: true,
    ...overrides,
  }
}

function renderDock(options: { bankroll: number; betting: BettingContext }) {
  const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
  const player = { ...game.players[0]!, bankroll: options.bankroll }
  return renderToStaticMarkup(
    createElement(WageringActionButtons, {
      currentPlayer: player,
      ctx: options.betting,
      raiseAmount: 20,
      dense: true,
      onRaiseAmountChange: noop,
      onCheck: noop,
      onCall: noop,
      onRaise: noop,
      onFold: noop,
      onAllIn: noop,
    }),
  )
}

describe('phone wager dock', () => {
  it('keeps call as the gold key and holds fold and all-in quiet', () => {
    const html = renderDock({ bankroll: 500, betting: ctx() })
    expect(html).toContain('player-game-btn--gold')
    expect(html).toContain('Call')
    expect(html).toContain('player-game-btn--fold')
    expect(html).toContain('data-armed="false"')
    const fold = html.slice(html.indexOf('player-game-btn--fold'))
    expect(fold.startsWith('player-game-btn--fold') || fold.includes('data-armed="false"')).toBe(true)
    expect(html).not.toContain('data-armed="true"')
  })

  it('treats a short-stack all-in call as the gold key', () => {
    const html = renderDock({
      bankroll: 10,
      betting: ctx({ toCall: 20, canCall: false, canRaise: false }),
    })
    const gold = html.indexOf('player-game-btn--gold')
    const allInLabel = html.indexOf('All-in')
    expect(gold).toBeGreaterThanOrEqual(0)
    expect(allInLabel).toBeGreaterThan(gold)
    expect(html.slice(gold, allInLabel)).not.toContain('player-game-btn--allin')
  })
})
