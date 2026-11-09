import { createEmptyGame } from '@qhe/core'
import { describe, expect, it } from 'vitest'
import { buildHostPhaseDockItems } from './hostDeskLayout'
import {
  dockForRoomWait,
  lastCallForBetsLabel,
  nextBandOverride,
  tablesStillBettingCount,
  venueCloseBettingBlockedHint,
  venueDealCommunityBlockedHint,
  venueRevealAnswerBlockedHint,
  venueStartAnswerBlockedHint,
} from './hostVenueActionGates'
import type { HostVenueFeltBeatRow } from '@qhe/net'

function felt(
  tableNum: number,
  phase: string,
  phaseStrictSig: string | null,
  extra?: Partial<HostVenueFeltBeatRow>,
): HostVenueFeltBeatRow {
  return {
    tableNum,
    phase,
    phaseStrictSig,
    active: true,
    seated: 2,
    questionText: null,
    questionAnswer: null,
    answerDeadlineMs: null,
    ...extra,
  } as HostVenueFeltBeatRow
}

describe('tables being waited on', () => {
  it('names the tables still behind instead of saying the room is out of sync', () => {
    const close = venueCloseBettingBlockedHint([
      felt(1, 'betting', 'bet|1|F|cc0'),
      felt(2, 'betting', 'bet|1|T|cc0'),
    ])
    expect(close).toBe('Waiting on table 2')

    const answer = venueStartAnswerBlockedHint([
      felt(1, 'answering', 'answer'),
      felt(3, 'betting', 'bet|2|T|cc5'),
    ])
    expect(answer).toBe('Waiting on table 3')
  })
})

describe('reveal while someone is betting', () => {
  it('keeps the shared cards back while a table still has the clock open', () => {
    const hint = venueDealCommunityBlockedHint([
      felt(1, 'betting', 'bet|1|F|cc0'),
      felt(2, 'betting', 'bet|1|T|cc0'),
    ])
    expect(hint).toContain('2')
    expect(hint).toContain('wagering open')
  })

  it('blocks Reveal the answer while any player is still betting', () => {
    const hint = venueRevealAnswerBlockedHint([
      felt(1, 'answering', 'answer'),
      felt(2, 'betting', 'bet|2|T|cc5', { playersToAct: 3 }),
      felt(6, 'betting', 'bet|2|T|cc5', { playersToAct: 1 }),
    ])
    expect(hint).toContain('2 (3)')
    expect(hint).toContain('6 (1)')
    const gameState = { ...createEmptyGame('HOST', 'host', '1'), phase: 'answering' as const }
    const items = buildHostPhaseDockItems({
      gameState,
      answerWindowSeconds: 60,
      dealCommunityBlocked: false,
      closeBetBlocked: false,
      startAnswerBlocked: false,
      revealAnswerBlocked: true,
      communityLen: 5,
      bettingRound: 2,
      onStartGame: () => {},
      onAssignFromLobby: () => {},
      onDealCommunity: () => {},
      onStartAnswering: () => {},
      onRevealAnswer: () => {},
      onEndRound: () => {},
      onRandomQuestion: () => {},
      onNextSetlist: () => {},
      onNudgeActing: () => {},
    })
    expect(items.find((item) => item.label === 'Reveal the answer')?.disabled).toBe(true)
  })

  it('keeps skip off the room-wide cue bar while betting is open', () => {
    const base = createEmptyGame('HOST', 'host', '1')
    const gameState = {
      ...base,
      phase: 'betting' as const,
      round: { ...base.round, isBettingOpen: true, bettingRound: 1 as const },
    }
    const items = buildHostPhaseDockItems({
      gameState,
      answerWindowSeconds: 60,
      dealCommunityBlocked: false,
      closeBetBlocked: false,
      startAnswerBlocked: false,
      communityLen: 0,
      bettingRound: 1,
      onStartGame: () => {},
      onAssignFromLobby: () => {},
      onDealCommunity: () => {},
      onStartAnswering: () => {},
      onRevealAnswer: () => {},
      onEndRound: () => {},
      onRandomQuestion: () => {},
      onNextSetlist: () => {},
      onNudgeActing: () => {},
    })
    expect(items.map((item) => item.label)).toEqual(['Close 1st betting round', 'Nudge slow players'])
  })

  it('keeps Reveal the answer off until the timer ends or every guess is in', () => {
    const open = venueRevealAnswerBlockedHint(
      [felt(1, 'answering', 'answer', { answerDeadlineMs: 10_000 })],
      [{ tableNum: 1, answersSubmitted: 1, answersExpected: 2 }],
      1_000,
    )
    expect(open).toContain('still guessing')
    const allIn = venueRevealAnswerBlockedHint(
      [felt(1, 'answering', 'answer', { answerDeadlineMs: 10_000 })],
      [{ tableNum: 1, answersSubmitted: 2, answersExpected: 2 }],
      1_000,
    )
    expect(allIn).toBeNull()
    const expired = venueRevealAnswerBlockedHint(
      [felt(1, 'answering', 'answer', { answerDeadlineMs: 10_000 })],
      [{ tableNum: 1, answersSubmitted: 0, answersExpected: 2 }],
      10_000,
    )
    expect(expired).toBeNull()
  })

  it('holds Pay winners until the winner screens finish one pass', () => {
    const gameState = { ...createEmptyGame('HOST', 'host', '1'), phase: 'showdown' as const }
    const items = buildHostPhaseDockItems({
      gameState,
      answerWindowSeconds: 60,
      dealCommunityBlocked: false,
      closeBetBlocked: false,
      startAnswerBlocked: false,
      payWinnersBlocked: true,
      communityLen: 5,
      bettingRound: 2,
      onStartGame: () => {},
      onAssignFromLobby: () => {},
      onDealCommunity: () => {},
      onStartAnswering: () => {},
      onRevealAnswer: () => {},
      onEndRound: () => {},
      onRandomQuestion: () => {},
      onNextSetlist: () => {},
      onNudgeActing: () => {},
    })
    expect(items.find((item) => item.label === 'Pay winners')?.disabled).toBe(true)
  })
})

describe('next band while tables differ', () => {
  it('waits on the slower table instead of the one that finished the street', () => {
    const wait = nextBandOverride([
      felt(1, 'betting', 'bet|1|F|cc0'),
      felt(2, 'betting', 'bet|1|T|cc0'),
    ])
    expect(wait?.nudge).toBe(true)
    expect(wait?.title).toContain('table 2')
    expect(wait?.title).not.toContain('table 1')
  })

  it('nudges while one table is still betting and another is already guessing', () => {
    const wait = nextBandOverride([
      felt(1, 'answering', 'answer'),
      felt(4, 'betting', 'bet|2|T|cc5'),
    ])
    expect(wait?.nudge).toBe(true)
    expect(wait?.title).toContain('4')
  })

  it('does not nudge when the slow table has already closed its clock', () => {
    const wait = nextBandOverride([
      felt(1, 'answering', 'answer'),
      felt(3, 'betting', 'bet|2|F|cc5'),
    ])
    expect(wait?.nudge).toBe(false)
    expect(wait?.title).toContain('3')
  })

  it('says the room is waiting when five or more tables are still betting', () => {
    const open = (tableNum: number) => felt(tableNum, 'betting', 'bet|1|T|cc0')
    const wait = nextBandOverride([
      felt(1, 'betting', 'bet|1|F|cc0'),
      ...[2, 3, 4, 5, 6].map((tableNum) => open(tableNum)),
    ])
    expect(wait).toEqual({ title: 'Waiting on tables to finish betting', nudge: true })
  })

  it('leaves the band alone when every table is on the same step', () => {
    expect(
      nextBandOverride([
        felt(1, 'betting', 'bet|1|F|cc0'),
        felt(2, 'betting', 'bet|1|F|cc0'),
      ]),
    ).toBeNull()
    expect(nextBandOverride([felt(1, 'answering', 'answer')])).toBeNull()
    expect(nextBandOverride(null)).toBeNull()
  })

  it('drops the lead-table button and keeps a rehearsal skip', () => {
    const built = [
      { id: 'deal-board', label: 'Deal the street' },
      { id: 'rehearsal-skip-showdown', label: 'Skip to winner screen' },
    ]
    const lastCall = { id: 'last-call', label: 'Last call for bets (1)' }
    const wait = nextBandOverride([
      felt(1, 'betting', 'bet|1|F|cc0'),
      felt(2, 'betting', 'bet|1|T|cc0'),
    ])
    expect(dockForRoomWait(built, wait, lastCall, 1).map((item) => item.id)).toEqual([
      'last-call',
      'rehearsal-skip-showdown',
    ])
    expect(dockForRoomWait(built, null, lastCall)).toBe(built)
    expect(
      dockForRoomWait(built, { title: 'Waiting on table 3', nudge: false }, lastCall, 0).map((item) => item.id),
    ).toEqual(['rehearsal-skip-showdown'])
  })

  it('keeps close and nudge when every table is ready, and adds last call', () => {
    const built = [
      { id: 'close-bet', label: 'Close 1st betting round' },
      { id: 'nudge', label: 'Nudge slow players (0)' },
    ]
    const lastCall = { id: 'last-call', label: lastCallForBetsLabel(2) }
    expect(dockForRoomWait(built, null, lastCall, 2).map((item) => item.label)).toEqual([
      'Close 1st betting round',
      'Nudge slow players (0)',
      'Last call for bets (2)',
    ])
    expect(tablesStillBettingCount([
      felt(1, 'betting', 'bet|1|T|cc0'),
      felt(2, 'betting', 'bet|1|T|cc0'),
      felt(3, 'betting', 'bet|1|F|cc0'),
    ])).toBe(2)
  })
})
