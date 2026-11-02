import { createEmptyGame } from '@qhe/core'
import { describe, expect, it } from 'vitest'
import { buildHostPhaseDockItems } from './hostDeskLayout'
import { venueDealCommunityBlockedHint, venueRevealAnswerBlockedHint } from './hostVenueActionGates'
import type { HostVenueFeltBeatRow } from '@qhe/net'

function felt(tableNum: number, phase: string, phaseStrictSig: string | null): HostVenueFeltBeatRow {
  return {
    tableNum,
    phase,
    phaseStrictSig,
    active: true,
    seated: 2,
    questionText: null,
    questionAnswer: null,
    answerDeadlineMs: null,
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
})
