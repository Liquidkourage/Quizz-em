import { addPlayer, createEmptyGame } from '@qhe/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  buildHostPhaseDockItems,
  buildHostRunOfShowSteps,
  hostRunOfShowHeadline,
  HostRunBar,
  HostTvBar,
} from './hostDeskLayout'

const noop = () => {}

describe('next question cue', () => {
  function dock(handsCompleted: number) {
    const gameState = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    return buildHostPhaseDockItems({
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
      handsCompleted,
    })
  }

  it('calls the board the street', () => {
    const gameState = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    gameState.phase = 'betting'
    gameState.round.isBettingOpen = false
    const steps = buildHostRunOfShowSteps(gameState)
    expect(steps.find((step) => step.id === 'deal-board')?.label).toBe('Deal the street')
    expect(steps.find((step) => step.id === 'deal-board')?.hint.toLowerCase()).toContain('deals the street')
    expect(steps.find((step) => step.id === 'close-bet-2')?.hint.toLowerCase()).not.toContain('shared cards')
    const items = buildHostPhaseDockItems({
      gameState,
      answerWindowSeconds: 60,
      dealCommunityBlocked: false,
      closeBetBlocked: false,
      startAnswerBlocked: false,
      communityLen: 0,
      bettingRound: 1,
      onStartGame: noop,
      onAssignFromLobby: noop,
      onDealCommunity: noop,
      onStartAnswering: noop,
      onRevealAnswer: noop,
      onEndRound: noop,
      onRandomQuestion: noop,
      onNextSetlist: noop,
      onNudgeActing: noop,
    })
    expect(items.find((item) => item.id === 'deal-board')?.label).toBe('Deal the street')
  })

  it('says Start Game before the first question and drops Random question', () => {
    const items = dock(0)
    expect(items.find((item) => item.role === 'primary')?.label).toBe('Start Game')
    expect(items.some((item) => item.label === 'Random question')).toBe(false)
    expect(items.some((item) => item.label === 'Show a random question')).toBe(false)
  })

  it('offers the next list question after a hand, with its text', () => {
    const items = dock(1)
    expect(items.find((item) => item.role === 'primary')?.label).toBe('Next question')
    expect(items.some((item) => item.label === 'Random question')).toBe(false)
    const held = buildHostPhaseDockItems({
      gameState: addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada'),
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
      handsCompleted: 5,
      nextQuestionBlocked: true,
    })
    expect(held.find((item) => item.label === 'Next question')?.disabled).toBe(true)

    const gameState = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const headline = hostRunOfShowHeadline(gameState, null, {
      hasActiveSetlist: true,
      nextQuestionText: 'How many minutes are there in a day?',
    })
    expect(headline.detail).toContain('How many minutes are there in a day?')
  })

  it('stops the next question when one player has the last stack', () => {
    const items = buildHostPhaseDockItems({
      gameState: addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada'),
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
      handsCompleted: 4,
      tournamentOver: true,
    })
    expect(items.some((item) => item.label === 'Next question')).toBe(false)
    expect(items.find((item) => item.role === 'primary')?.label).toBe('Game over')
  })

  it('tells the host to choose the public screen after a payout', () => {
    const gameState = addPlayer(createEmptyGame('HOST01', 'host', '1'), 'p1', 'Ada')
    const headline = hostRunOfShowHeadline(gameState, null, { afterPayout: true })
    expect(headline.detail).toContain('chip scores')
    expect(headline.detail).toContain('seating chart')
  })
})

describe('host run bar', () => {
  it('lights the next cue and quiets the other controls', () => {
    const html = renderToStaticMarkup(
      createElement(HostRunBar, {
        pacingUrgency: 'now',
        headline: { title: 'Close betting' },
        items: [
          { id: 'close', label: 'Close betting', onClick: noop, variant: 'gold', role: 'primary' },
          { id: 'nudge', label: 'Nudge slow player', onClick: noop, variant: 'blue', role: 'secondary' },
        ],
      }),
    )
    expect(html).toContain('data-urgency="now"')
    expect(html).toContain('host-cue-primary')
    expect(html).toContain('host-cue-quiet')
    expect(html.indexOf('host-cue-primary')).toBeLessThan(html.indexOf('host-cue-quiet'))
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

  it('mentions scores when this hand has not shown them', () => {
    const html = renderToStaticMarkup(
      createElement(HostTvBar, {
        onVenueFloor: noop,
        onLeaderboard: noop,
        onTriviaLeaderboard: noop,
        onSeatingRules: noop,
        scoresHint: 'Chip scores or trivia scores have not been up.',
      }),
    )
    expect(html).toContain('have not been up')
    expect(html).toContain('text-white/45')
  })
})
