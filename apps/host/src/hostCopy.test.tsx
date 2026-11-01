import { addPlayer, createEmptyGame } from '@qhe/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostLivePanel } from './HostLivePanel'
import { HostPreShowPanel } from './HostPreShowPanel'
import { HostFloorStrip, HostTvBar, HostVenueFloorBriefPanel } from './hostDeskLayout'
import type { HostVenueFeltBeatRow, HostVenueFloorBriefPayload } from '@qhe/net'
import { suggestNextHostAction } from './hostPacingCopilot'

function felt(tableNum: number, sig: string): HostVenueFeltBeatRow {
  return {
    tableNum,
    active: true,
    seated: 2,
    phase: 'answering',
    street: 'board',
    clock: '',
    answerDeadlineMs: null,
    phaseStrictSig: sig,
  }
}

describe('host explanatory copy', () => {
  it('keeps the next cue to a title', () => {
    const answering = createEmptyGame('HOST01', 'host', '1')
    answering.phase = 'answering'
    const reveal = suggestNextHostAction(answering, null)
    expect(reveal.title).toBe('Reveal when ready')
    expect(reveal.detail).toBe('')

    const betting = createEmptyGame('HOST01', 'host', '1')
    betting.phase = 'betting'
    betting.round.isBettingOpen = true
    const close = suggestNextHostAction(betting, null)
    expect(close.detail).not.toContain('Tip:')
    expect(close.detail).not.toContain('Close when')

    const lobby = createEmptyGame('HOST01', 'host', 'LOBBY')
    const join = suggestNextHostAction(lobby, null)
    expect(join.detail).not.toContain('Share room')
    expect(join.detail).not.toContain('Follow the primary cue')

    const showQuestion = createEmptyGame('HOST01', 'host', '1')
    showQuestion.phase = 'question'
    const next = suggestNextHostAction(showQuestion, null, {
      nextQuestionText: 'How long was Apollo 11?',
    })
    expect(next.detail).toContain('How long was Apollo 11?')
    expect(next.detail).not.toContain('Cards stay')
  })

  it('drops how-to lines from the live desk', () => {
    const live = renderToStaticMarkup(
      createElement(HostLivePanel, {
        gameState: createEmptyGame('HOST01', 'host', 'LOBBY'),
        phaseDockItems: [],
        runOfShowHeadline: { title: 'Seat players' },
        pacingUrgency: 'ready',
        runBarCueHint: null,
        onVenueFloor: () => {},
        onLeaderboard: () => {},
        onTriviaLeaderboard: () => {},
        onSeatingRules: () => {},
        venueFeltBeat: null,
        handShow: false,
        handBody: null,
        onGoPreShow: () => {},
      }),
    )
    expect(live).toContain('Seat players first')
    expect(live).not.toContain('Live cues appear')

    const tvs = renderToStaticMarkup(
      createElement(HostTvBar, {
        onVenueFloor: () => {},
        onLeaderboard: () => {},
        onSeatingRules: () => {},
      }),
    )
    expect(tvs).not.toContain('Highlight one table')

    const tables = renderToStaticMarkup(
      createElement(HostFloorStrip, {
        rows: [felt(1, 'answer'), felt(2, 'bet')],
        brief: null,
        onSpotlight: () => {},
      }),
    )
    expect(tables).not.toContain('click that table')
    expect(tables).not.toContain('Show table 1 large')

    const floorBrief: HostVenueFloorBriefPayload = {
      actionRows: [],
      moveLog: [],
      busts: [],
      bigWinners: [],
      bigBets: [],
      handBets: [],
      bigWinMinAmount: 300,
      fieldPlayerCount: 4,
      liveTableCount: 2,
      roster: [],
      venueHeld: false,
      shuffleEveryHands: 5,
      venueShuffleHeld: false,
      handsUntilShuffle: 5,
    }
    const felts = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floorBrief,
        feltRows: [felt(1, 'answer'), felt(2, 'bet')],
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        onAlignRoom: () => {},
        onSetTablePhase: () => {},
      }),
    )
    expect(felts).toContain('Match the room')
    expect(felts).not.toContain('Click a table to set its phase')
    expect(felts).not.toContain('venue-wide cues')
  })

  it('drops how-to lines from pre-show', () => {
    const lobby = addPlayer(createEmptyGame('HOST01', 'host', 'LOBBY'), 'p1', 'Ada')
    const html = renderToStaticMarkup(
      createElement(HostPreShowPanel, {
        gameState: lobby,
        hostPlayerLabel: (name: string) => name,
        tvPairCode: '',
        setTvPairCode: () => {},
        onSeatPlayers: () => {},
        onRemovePlayer: () => {},
        onGoQuestions: () => {},
        onPairTv: () => {},
      }),
    )
    expect(html).not.toContain('/display')
    expect(html).not.toContain('Auto fills')
    expect(html).not.toContain('then seat')
    expect(html).toContain('Seat players at tables')
  })
})
