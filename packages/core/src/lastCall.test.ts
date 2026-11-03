import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  createEmptyGame,
  dealCommunityCards,
  playerAllIn,
  playerCall,
  playerRaise,
  setRaisesClosed,
  type GameState,
} from './index'

function openBetting(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'a', 'Ada', 1000)
  gs = addPlayer(gs, 'b', 'Bo', 1000)
  return {
    ...gs,
    phase: 'betting',
    smallBlind: 10,
    bigBlind: 20,
    round: {
      ...gs.round,
      isBettingOpen: true,
      bettingRound: 1,
      currentPlayerIndex: 0,
      currentBet: 20,
      playerBets: { a: 0, b: 20 },
      handContributions: { b: 20 },
      pot: 20,
      lastFullRaiseAmount: 20,
    },
  }
}

describe('last call for bets', () => {
  it('blocks a raise and still allows a call', () => {
    const open = openBetting()
    const raised = playerRaise(open, 'a', 20)
    expect(raised.round.currentBet).toBeGreaterThan(20)

    const closed = setRaisesClosed(open, true)
    expect(playerRaise(closed, 'a', 20)).toBe(closed)
    const called = playerCall(closed, 'a')
    expect(called.round.playerBets?.a).toBe(20)
    expect(called.players[0]?.bankroll).toBe(980)
  })

  it('turns a full-stack shove into a call, and still takes a short stack', () => {
    const closed = setRaisesClosed(openBetting(), true)
    const called = playerAllIn(closed, 'a')
    expect(called.players[0]?.bankroll).toBe(980)
    expect(called.round.currentBet).toBe(20)

    const short = setRaisesClosed(
      {
        ...openBetting(),
        players: openBetting().players.map((player, index) =>
          index === 0 ? { ...player, bankroll: 10 } : player,
        ),
      },
      true,
    )
    const jammed = playerAllIn(short, 'a')
    expect(jammed.players[0]?.bankroll).toBe(0)
    expect(jammed.players[0]?.isAllIn).toBe(true)
  })

  it('clears last call when the board is dealt', () => {
    const closed = setRaisesClosed(openBetting(), true)
    const paused = {
      ...closed,
      round: { ...closed.round, isBettingOpen: false, currentPlayerIndex: -1 },
    }
    const dealt = dealCommunityCards(paused)
    expect(dealt.round.bettingRound).toBe(2)
    expect(dealt.round.raisesClosed).toBe(false)
  })
})
