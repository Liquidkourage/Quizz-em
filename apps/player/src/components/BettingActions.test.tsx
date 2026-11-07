import { addPlayer, createEmptyGame } from '@qhe/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { BettingContext } from '../playerModel/bettingModel'
import BettingActions from './BettingActions'

const noop = () => {}

describe('BettingActions', () => {
  it('keeps Call, Raise, Fold, and All-in outside the scrolling stack', () => {
    const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const player = { ...game.players[0]!, bankroll: 1000 }
    const ctx: BettingContext = {
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
      raisesClosed: false,
    }
    const html = renderToStaticMarkup(
      createElement(BettingActions, {
        currentPlayer: player,
        ctx,
        raiseAmount: 20,
        onRaiseAmountChange: noop,
        onCheck: noop,
        onCall: noop,
        onRaise: noop,
        onFold: noop,
        onAllIn: noop,
      }),
    )
    const scrollAt = html.indexOf('player-game-wager-scroll')
    const actionsAt = html.indexOf('player-game-wager-actions')
    expect(scrollAt).toBeGreaterThan(0)
    expect(html.slice(scrollAt, actionsAt)).toContain('Your stack')
    expect(actionsAt).toBeGreaterThan(scrollAt)
    expect(html.slice(actionsAt)).toContain('Call')
    expect(html.slice(actionsAt)).toContain('Fold')
    expect(html.slice(actionsAt)).toContain('All-in')
  })
})
