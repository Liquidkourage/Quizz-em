import { describe, expect, it } from 'vitest'
import type { GhostSeat } from './ghostHost'
import { addPlayer, createEmptyGame, endRound, pickLateEntryHost, seatGhostsBesideHosts } from './index'

describe('ghost host', () => {
  it('sends a busted player with the player who won the main pot', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'win', 'Win', 100)
    gs = addPlayer(gs, 'bust', 'Bust', 0)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 100,
        handContributions: { win: 50, bust: 50 },
        question: { id: 'q', text: '?', answer: 10 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 10, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, submittedAnswer: 0, hasFolded: false, isAllIn: true },
      ],
    }

    const done = endRound(gs)
    const bust = done.players.find((player) => player.id === 'bust')
    const win = done.players.find((player) => player.id === 'win')

    expect(bust?.pointsOnly).toBe(true)
    expect(bust?.ghostHostId).toBe('win')
    expect(win?.ghostHostId).toBeUndefined()
  })

  it('keeps following the same host while that host still has chips', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'win', 'Win', 200)
    gs = addPlayer(gs, 'bust', 'Bust', 0)
    gs = addPlayer(gs, 'next', 'Next', 50)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 50,
        handContributions: { win: 0, next: 50 },
        question: { id: 'q', text: '?', answer: 10 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 99, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, submittedAnswer: 10, hasFolded: false, isAllIn: false, pointsOnly: true, ghostHostId: 'win', bankroll: 0 },
        { ...gs.players[2]!, submittedAnswer: 10, hasFolded: false, isAllIn: true, bankroll: 0 },
      ],
    }

    const done = endRound(gs)
    expect(done.players.find((player) => player.id === 'bust')?.ghostHostId).toBe('win')
  })

  it('follows the main-pot winner when another player takes the side pot', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'short', 'Short', 800)
    gs = addPlayer(gs, 'big', 'Big', 400)
    gs = addPlayer(gs, 'mid', 'Mid', 650)
    gs = addPlayer(gs, 'bust', 'Bust', 0)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 950,
        handContributions: { short: 100, big: 500, mid: 250, bust: 100 },
        question: { id: 'q', text: '?', answer: 42 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 42, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, submittedAnswer: 99, hasFolded: false, isAllIn: false },
        { ...gs.players[2]!, submittedAnswer: 50, hasFolded: false, isAllIn: false },
        { ...gs.players[3]!, submittedAnswer: 0, hasFolded: false, isAllIn: true },
      ],
    }

    const done = endRound(gs)
    expect(done.players.find((player) => player.id === 'bust')?.ghostHostId).toBe('short')
  })

  it('splits a shared main pot so each new bust follows a different winner', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'a', 'A', 100)
    gs = addPlayer(gs, 'b', 'B', 100)
    gs = addPlayer(gs, 'bust1', 'Bust 1', 0)
    gs = addPlayer(gs, 'bust2', 'Bust 2', 0)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 100,
        handContributions: { a: 25, b: 25, bust1: 25, bust2: 25 },
        question: { id: 'q', text: '?', answer: 10 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 10, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, submittedAnswer: 10, hasFolded: false, isAllIn: false },
        { ...gs.players[2]!, submittedAnswer: 0, hasFolded: false, isAllIn: true },
        { ...gs.players[3]!, submittedAnswer: 0, hasFolded: false, isAllIn: true },
      ],
    }

    const done = endRound(gs)
    expect(done.players.find((player) => player.id === 'bust1')?.ghostHostId).toBe('a')
    expect(done.players.find((player) => player.id === 'bust2')?.ghostHostId).toBe('b')
  })

  it('seats each ghost at their host’s table', () => {
    const tables = new Map<number, GhostSeat[]>([
      [1, [{ id: 'ada', bankroll: 500, pointsOnly: false }]],
      [2, [{ id: 'cam', bankroll: 500, pointsOnly: false }]],
    ])
    const seated = seatGhostsBesideHosts(tables, [
      { id: 'boo', bankroll: 0, pointsOnly: true, ghostHostId: 'cam' },
    ])

    expect(seated.get(1)?.map((player) => player.id)).toEqual(['ada'])
    expect(seated.get(2)?.map((player) => player.id)).toEqual(['cam', 'boo'])
  })
})

describe('late entry host', () => {
  it('sits a new points-only player with the chip player who has the fewest followers', () => {
    const tables = [
      {
        tableNum: 1,
        players: [
          { id: 'ada', bankroll: 500, pointsOnly: false },
          { id: 'boo', bankroll: 0, pointsOnly: true, ghostHostId: 'ada' },
        ],
      },
      {
        tableNum: 2,
        players: [{ id: 'cam', bankroll: 500, pointsOnly: false }],
      },
    ]

    expect(pickLateEntryHost(tables)).toBe('cam')
  })

  it('uses the lowest table when every chip player has the same number of followers', () => {
    const tables = [
      { tableNum: 2, players: [{ id: 'cam', bankroll: 500, pointsOnly: false }] },
      { tableNum: 1, players: [{ id: 'ada', bankroll: 500, pointsOnly: false }] },
    ]

    expect(pickLateEntryHost(tables)).toBe('ada')
  })

  it('has nobody to follow when every stack is gone', () => {
    expect(
      pickLateEntryHost([{ tableNum: 1, players: [{ id: 'boo', bankroll: 0, pointsOnly: true }] }]),
    ).toBeNull()
  })
})
