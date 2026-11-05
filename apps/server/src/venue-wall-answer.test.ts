import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, displayedMainPot, endRound, type GameState } from '@qhe/core'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import type { Server } from 'socket.io'
import { buildHostVenueActionRows } from './venue-host-log'
import {
  bindGameIo,
  emitDisplayVenueSnapshotNow,
  prepareVenuePersistence,
  rooms,
  runVenueCondenseAfterRound,
  tableSessionKey,
} from './game-ops'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

const ANSWER = 1440

function captureIo(): { server: Server; snapshots: DisplayVenueWallSnapshot[] } {
  const snapshots: DisplayVenueWallSnapshot[] = []
  const server = {
    to: () => ({
      emit: (event: string, payload?: DisplayVenueWallSnapshot) => {
        if (event === 'displayVenueSnapshot' && payload) snapshots.push(payload)
      },
    }),
    sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
  } as unknown as Server
  return { server, snapshots }
}

function seat(tableId: string, phase: 'answering' | 'showdown', answerDeadline?: number): void {
  let gs = createEmptyGame('LEAK', 'host', tableId)
  gs = addPlayer(gs, `${tableId}-a`, 'Ada')
  gs = addPlayer(gs, `${tableId}-b`, 'Bea')
  rooms.set(tableSessionKey('LEAK', tableId), {
    ...gs,
    phase,
    round: {
      ...gs.round,
      question: { id: 'q1', text: 'How many minutes are there in a day?', answer: ANSWER },
      ...(answerDeadline != null ? { answerDeadline } : {}),
    },
  } as GameState)
}

beforeAll(async () => {
  await prepareVenuePersistence()
})

beforeEach(() => {
  rooms.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe('public venue wall answer', () => {
  it('does not send the correct answer while a table is still guessing', () => {
    seat('1', 'showdown')
    seat('2', 'answering', 1_700_000_000_000)
    const io = captureIo()
    bindGameIo(io.server)
    emitDisplayVenueSnapshotNow('LEAK')
    const snap = io.snapshots.at(-1)
    expect(snap?.headlineQuestionAnswer ?? null).toBeNull()
    expect(snap?.tiles.every((t) => t.showdownAnswer == null)).toBe(true)
  })

  it('does not send the headline answer when guessing has no countdown', () => {
    seat('1', 'showdown')
    seat('2', 'answering')
    const io = captureIo()
    bindGameIo(io.server)
    emitDisplayVenueSnapshotNow('LEAK')
    const snap = io.snapshots.at(-1)
    expect(snap?.headlineQuestionAnswer ?? null).toBeNull()
    expect(snap?.tiles.every((t) => t.showdownAnswer == null)).toBe(true)
  })

  it('keeps a busted player on the trivia snapshot after payout', () => {
    let gs = createEmptyGame('LEAK', 'host', '1')
    gs = addPlayer(gs, 'bust', 'Bo Kent', 0)
    gs = addPlayer(gs, 'live', 'Ada Lane', 500)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 100,
        question: { id: 'q', text: '?', answer: 42 },
        handContributions: { live: 100 },
      },
      players: [
        { ...gs.players[0]!, bankroll: 0, submittedAnswer: 42, hasFolded: false, answerPoints: 0 },
        { ...gs.players[1]!, submittedAnswer: 40, hasFolded: false, answerPoints: 10 },
      ],
    }
    rooms.set(tableSessionKey('LEAK', '1'), endRound(gs))
    const io = captureIo()
    bindGameIo(io.server)
    emitDisplayVenueSnapshotNow('LEAK')
    const snap = io.snapshots.at(-1)
    const tile = snap?.tiles.find((row) => (row.seatNames ?? []).includes('Bo Kent'))
    const seat = tile?.seatNames.indexOf('Bo Kent') ?? -1
    expect(seat).toBeGreaterThanOrEqual(0)
    expect(tile?.seatPointsOnly?.[seat]).toBe(true)
    expect(tile?.seatAnswerPoints?.[seat]).toBe(100)
    expect(snap?.triviaField?.map((row) => row.name)).toContain('Bo Kent')
  })

  it('keeps a busted player on the trivia snapshot after a table shuffle', () => {
    const paid = (tableId: string, bustName: string | null) => {
      let gs = createEmptyGame('LEAK', 'host', tableId)
      gs = addPlayer(gs, `${tableId}-a`, bustName ?? 'Cara Moss', bustName ? 0 : 500)
      gs = addPlayer(gs, `${tableId}-b`, bustName ? 'Ada Lane' : 'Dean Orr', 500)
      return endRound({
        ...gs,
        phase: 'showdown',
        round: {
          ...gs.round,
          pot: 80,
          question: { id: 'q', text: '?', answer: 42 },
          handContributions: { [`${tableId}-b`]: 80 },
        },
        players: gs.players.map((player, index) => ({
          ...player,
          bankroll: bustName && index === 0 ? 0 : 500,
          submittedAnswer: 42,
          hasFolded: false,
          answerPoints: 0,
        })),
      })
    }
    rooms.set(tableSessionKey('LEAK', '1'), paid('1', 'Bo Kent'))
    rooms.set(tableSessionKey('LEAK', '2'), paid('2', null))
    const io = captureIo()
    bindGameIo(io.server)
    runVenueCondenseAfterRound('LEAK', 'host', true)
    emitDisplayVenueSnapshotNow('LEAK')
    const snap = io.snapshots.at(-1)
    const seatedNames = (snap?.tiles ?? []).flatMap((tile) => tile.seatNames ?? [])
    expect(seatedNames).toContain('Bo Kent')
    expect(snap?.triviaField?.map((row) => row.name)).toContain('Bo Kent')
  })

  it('sends the correct answer once every seated table is in results', () => {
    seat('1', 'showdown')
    seat('2', 'showdown')
    const io = captureIo()
    bindGameIo(io.server)
    emitDisplayVenueSnapshotNow('LEAK')
    const snap = io.snapshots.at(-1)
    expect(snap?.headlineQuestionAnswer).toBe(ANSWER)
    expect(snap?.tiles.map((t) => t.showdownAnswer)).toEqual([ANSWER, ANSWER])
  })

  it('keeps points-only chairs, their points, and the phone pot on one snapshot', () => {
    let gs = createEmptyGame('LEAK', 'host', '1')
    gs = addPlayer(gs, 'maria', 'Maria A.', 960)
    gs = addPlayer(gs, 'priya', 'Priya A.', 820)
    gs = addPlayer(gs, 'jamal', 'Jamal A.', 0)
    gs = addPlayer(gs, 'elena', 'Elena C.', 0)
    const players = gs.players.map((player) => {
      if (player.id === 'jamal') return { ...player, pointsOnly: true, answerPoints: 185.59 }
      if (player.id === 'elena') return { ...player, pointsOnly: true, answerPoints: 281.81 }
      return player
    })
    gs = {
      ...gs,
      phase: 'question',
      players,
      round: {
        ...gs.round,
        question: { id: 'wings', text: 'Wingspan', answer: 224.4 },
        pot: 0,
        handContributions: { maria: 10, priya: 10 },
      },
    }
    rooms.set(tableSessionKey('LEAK', '1'), gs)
    const io = captureIo()
    bindGameIo(io.server)
    emitDisplayVenueSnapshotNow('LEAK')
    const tile = io.snapshots.at(-1)?.tiles.find((row) => row.tableNum === 1)
    const names = tile?.seatNames ?? []
    const maria = names.indexOf('Maria A.')
    const jamal = names.indexOf('Jamal A.')
    const elena = names.indexOf('Elena C.')
    expect(tile?.pot).toBe(displayedMainPot(gs))
    expect(tile?.pot).toBe(20)
    expect(maria).toBeGreaterThanOrEqual(0)
    expect(tile?.seatBankrolls?.[maria]).toBe(960)
    expect(tile?.seatAnswerPoints?.[jamal]).toBe(185.59)
    expect(tile?.seatAnswerPoints?.[elena]).toBe(281.81)
    const jamalSeat = buildHostVenueActionRows(tile ? [tile] : [])[0]?.seats.find((seat) => seat.name === 'Jamal A.')
    expect(jamalSeat?.answerPoints).toBe(185.59)
    expect(jamalSeat?.kind).toBe('points')
  })
})
