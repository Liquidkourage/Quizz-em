import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, type GameState } from '@qhe/core'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  emitDisplayVenueSnapshotNow,
  prepareVenuePersistence,
  rooms,
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
})
