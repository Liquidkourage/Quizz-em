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
      preAction: null,
      onPreActionChange: noop,
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
  })

  it('stays quiet while someone else is betting', () => {
    const html = renderDock(false)
    expect(html).toContain('player-game-dock--waiting')
    expect(html).toContain('Waiting')
    expect(html).not.toContain('player-game-dock--your-turn')
  })
})
