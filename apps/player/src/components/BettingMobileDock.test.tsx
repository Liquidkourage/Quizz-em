import { addPlayer, createEmptyGame } from '@qhe/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { BettingContext } from '../playerModel/bettingModel'
import BettingMobileDock from './BettingMobileDock'

const noop = () => {}

function ctx(isMyTurn: boolean): BettingContext {
  return {
    isBettingPhase: true,
    isBettingOpen: true,
    isMyTurn,
    myContribution: 0,
    currentBet: 20,
    toCall: 20,
    minRaise: 20,
    isOpeningBet: false,
    canBet: true,
    canCheck: false,
    canCall: isMyTurn,
    canRaise: isMyTurn,
    canAllIn: isMyTurn,
    canFold: isMyTurn,
    raisesClosed: false,
  }
}

function renderDock(isMyTurn: boolean) {
  const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
  const player = { ...game.players[0]!, bankroll: 500 }
  return renderToStaticMarkup(
    createElement(BettingMobileDock, {
      currentPlayer: player,
      ctx: ctx(isMyTurn),
      raiseAmount: 20,
      autoCallLimit: null,
      onAutoCallLimitChange: noop,
      onRaiseAmountChange: noop,
      onCheck: noop,
      onCall: noop,
      onRaise: noop,
      onFold: noop,
      onAllIn: noop,
    }),
  )
}

describe('betting turn cue', () => {
  it('keeps a your-turn mark on the dock for the whole turn', () => {
    const html = renderDock(true)
    expect(html).toContain('player-game-dock--your-turn')
    expect(html).toContain('player-game-turn-banner')
    expect(html).toContain('Your turn')
    expect(html).not.toContain('lg:hidden')
    expect(html).toContain('Wagering')
    expect(html).toContain('Your stack')
    expect(html).toContain('Round')
    expect(html).toContain('>open<')
    expect(html).toContain('To call')
    expect(html).toContain('Min raise')
    expect(html).toContain('Yours')
    expect(html).toContain('Total includes the $20 call')
    expect(html).toContain('All-in $500')
    expect(html).toContain('Raise to <span>(min ')
    expect(html).toContain('aria-label="$40"')
    expect(html).toContain('player-game-stat-turn')
    expect(html).toContain('Turn <strong')
    expect(html.match(/aria-label="\$500"/g)).toHaveLength(2)
    expect(html.match(/aria-label="\$20"/g)).toHaveLength(2)
  })

  it('states the opening minimum when nobody has bet yet', () => {
    const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const player = { ...game.players[0]!, bankroll: 500 }
    const opening = ctx(true)
    opening.isOpeningBet = true
    opening.toCall = 0
    opening.canCall = false
    opening.canCheck = true
    const html = renderToStaticMarkup(
      createElement(BettingMobileDock, {
        currentPlayer: player,
        ctx: opening,
        raiseAmount: 20,
        autoCallLimit: null,
        onAutoCallLimitChange: noop,
        onRaiseAmountChange: noop,
        onCheck: noop,
        onCall: noop,
        onRaise: noop,
        onFold: noop,
        onAllIn: noop,
      }),
    )
    expect(html).toContain('Opening bet must be at least $20')
    expect(html).toContain('Bet to <span>(min ')
    expect(html).toContain('(min <span class="chip-text" style="display:inline" aria-label="$20">')
  })

  it('states an opening raise when the bet to the player is free', () => {
    const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const player = { ...game.players[0]!, bankroll: 500 }
    const free = ctx(true)
    free.toCall = 0
    free.isBettingOpen = false
    free.canCall = false
    free.canCheck = true
    const html = renderToStaticMarkup(
      createElement(BettingMobileDock, {
        currentPlayer: player,
        ctx: free,
        raiseAmount: 20,
        autoCallLimit: null,
        onAutoCallLimitChange: noop,
        onRaiseAmountChange: noop,
        onCheck: noop,
        onCall: noop,
        onRaise: noop,
        onFold: noop,
        onAllIn: noop,
      }),
    )
    expect(html).toContain('Opening raise must be at least $20')
    expect(html).toContain('>closed<')
    expect(html).not.toContain('Total includes')
  })

  it('keeps an opening bet on the opening sentence even when a call amount is set', () => {
    const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const player = { ...game.players[0]!, bankroll: 500 }
    const opening = ctx(true)
    opening.isOpeningBet = true
    opening.toCall = 20
    const html = renderToStaticMarkup(
      createElement(BettingMobileDock, {
        currentPlayer: player,
        ctx: opening,
        raiseAmount: 20,
        autoCallLimit: null,
        onAutoCallLimitChange: noop,
        onRaiseAmountChange: noop,
        onCheck: noop,
        onCall: noop,
        onRaise: noop,
        onFold: noop,
        onAllIn: noop,
      }),
    )
    expect(html).toContain('Opening bet must be at least $40')
    expect(html).not.toContain('Total includes')
  })

  it('stays quiet while someone else is betting', () => {
    const html = renderDock(false)
    expect(html).toContain('player-game-dock--waiting')
    expect(html.match(/>Waiting</g)).toHaveLength(2)
    expect(html).toContain('Auto-Action')
    expect(html).toContain('Check or call up to')
    expect(html).toContain('Otherwise, fold.')
    expect(html).toContain('aria-label="Check or call up to"')
    expect(html).toContain('value=""')
    expect(html).not.toContain('Check / fold')
    expect(html).not.toContain('Call any')
    expect(html).toContain('<strong class="">Waiting</strong>')
    expect(html).not.toContain('player-game-stat-turn')
    expect(html).not.toContain('auto…')
    expect(html).not.toContain('player-game-dock--your-turn')
  })

  it('shows the saved call limit while waiting', () => {
    const game = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const player = { ...game.players[0]!, bankroll: 500 }
    const html = renderToStaticMarkup(
      createElement(BettingMobileDock, {
        currentPlayer: player,
        ctx: ctx(false),
        raiseAmount: 20,
        autoCallLimit: 40,
        onAutoCallLimitChange: noop,
        onRaiseAmountChange: noop,
        onCheck: noop,
        onCall: noop,
        onRaise: noop,
        onFold: noop,
        onAllIn: noop,
      }),
    )
    expect(html).toContain('value="40"')
    expect(html).toContain('Otherwise, fold.')
  })
})
