import { createEmptyGame } from '@qhe/core'
import { describe, expect, it } from 'vitest'
import { buildHostPhaseDockItems } from './hostDeskLayout'
import { venueDealCommunityBlockedHint, venueRevealAnswerBlockedHint } from './hostVenueActionGates'
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
      felt(2, 'betting', 'bet|2|T|cc5'),
    ])
    expect(hint).toContain('2')
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
