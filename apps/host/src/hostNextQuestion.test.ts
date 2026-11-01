import { addPlayer, createEmptyGame } from '@qhe/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildHostPhaseDockItems, hostRunOfShowHeadline, HostTvBar } from './hostDeskLayout'

const noop = () => {}

describe('next question cue', () => {
  it('offers the next list question after a hand, with its text', () => {
    const gameState = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const items = buildHostPhaseDockItems({
      gameState,
      answerWindowSeconds: 60,
      dealCommunityBlocked: false,
      closeBetBlocked: false,
      startAnswerBlocked: false,
      communityLen: 0,
      bettingRound: 0,
      onStartGame: noop,
      onAssignFromLobby: noop,
      onDealCommunity: noop,
      onStartAnswering: noop,
      onRevealAnswer: noop,
      onEndRound: noop,
      onRandomQuestion: noop,
      onNextSetlist: noop,
      onNudgeActing: noop,
      hasActiveSetlist: true,
    })
    expect(items.find((item) => item.role === 'primary')?.label).toBe('Next question')
    expect(items.some((item) => item.label === 'Show a random question')).toBe(false)

    const headline = hostRunOfShowHeadline(gameState, null, {
      hasActiveSetlist: true,
      nextQuestionText: 'How many minutes are there in a day?',
    })
    expect(headline.detail).toContain('How many minutes are there in a day?')
  })

  it('tells the host to choose the public screen after a payout', () => {
    const gameState = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const headline = hostRunOfShowHeadline(gameState, null, { afterPayout: true })
    expect(headline.detail).toContain('chip scores')
    expect(headline.detail).toContain('seating chart')
  })
})

describe('audience TV controls', () => {
  it('lets the host put seating and eliminations on the TVs', () => {
    const html = renderToStaticMarkup(
      createElement(HostTvBar, {
        onVenueFloor: noop,
        onLeaderboard: noop,
        onTriviaLeaderboard: noop,
        onSeatingRules: noop,
        onSeatingChart: noop,
        onEliminations: noop,
      }),
    )
    expect(html).toContain('Seating')
    expect(html).toContain('Eliminations')
  })
})
