import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueSeatingRulesWall from './VenueSeatingRulesWall'
import {
  HOW_TO_PLAY_STEPS,
  howToPlayFrame,
  howToPlayJoinUrl,
  howToPlayQrSrc,
} from './howToPlayTutorial'

describe('how to play lesson', () => {
  it('opens on the example question, before any cards', () => {
    const frame = howToPlayFrame(0)
    expect(frame.title).toBe('Every round starts with a trivia question.')
    expect(frame.question).toBe('How many minutes are in a day?')
    expect(frame.stepLabel).toBe('Step 1 of 7')
    expect(frame.holeFaces).toEqual(['hidden', 'hidden'])
    expect(frame.boardFaces.every((face) => face === 'hidden')).toBe(true)
    expect(frame.answerRevealed).toBe(false)
    expect(frame.showCallout).toBe(false)
    expect(frame.showOutcome).toBe(false)
  })

  it('deals two private cards, then asks for a bet or a fold', () => {
    expect(howToPlayFrame(1).holeFaces).toEqual(['shown', 'shown'])
    const bet = howToPlayFrame(2)
    expect(bet.showCallout).toBe(true)
    expect(bet.callout).toBe('Bet or fold?')
    expect(bet.boardFaces.every((face) => face === 'hidden')).toBe(true)
  })

  it('deals five shared cards, then asks for the second decision', () => {
    expect(howToPlayFrame(3).boardFaces).toEqual(['shown', 'shown', 'shown', 'shown', 'shown'])
    const second = howToPlayFrame(4)
    expect(second.showCallout).toBe(true)
    expect(second.segmentLabel).toBe('Community')
  })

  it('builds 1,439.9 from five of the seven cards', () => {
    const frame = howToPlayFrame(5)
    expect(frame.answerRevealed).toBe(true)
    expect(frame.answerDigits).toEqual([1, 4, 3, 9, 9])
    expect(frame.decimalBefore).toBe(4)
    expect(frame.holeFaces).toEqual(['selected', 'selected'])
    expect(frame.boardFaces).toEqual(['selected', 'selected', 'selected', 'dimmed', 'dimmed'])
    expect(frame.hint).toContain('1,439.9')
  })

  it('shows the correct answer and that this guess wins the pot', () => {
    const frame = howToPlayFrame(6)
    expect(frame.showOutcome).toBe(true)
    expect(frame.submittedAnswer).toBe('1,439.9')
    expect(frame.correctAnswer).toBe('1,440')
    expect(frame.outcomeDetail).toContain('0.1')
    expect(frame.segmentLabel).toBe('Winner')
    expect(frame.stepLabel).toBe('Step 7 of 7')
  })

  it('loops back to the question after the last step', () => {
    expect(howToPlayFrame(HOW_TO_PLAY_STEPS.length).stepIndex).toBe(0)
    expect(howToPlayFrame(-1).stepIndex).toBe(HOW_TO_PLAY_STEPS.length - 1)
  })

  it('shows the opening beat on the TV with nothing to tap', () => {
    const html = renderToStaticMarkup(createElement(VenueSeatingRulesWall, { step: 0, venueCode: 'AB12' }))
    expect(html).toContain('How many minutes are in a day?')
    expect(html).toContain('Every round starts with a trivia question.')
    expect(html).toContain('Step 1 of 7')
    expect(html).toContain('Room AB12')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('1,440')
  })

  it('shows the winning beat without a control on the glass', () => {
    const html = renderToStaticMarkup(createElement(VenueSeatingRulesWall, { step: 6 }))
    expect(html).toContain('1,439.9')
    expect(html).toContain('1,440')
    expect(html).toContain('Just 0.1 away')
    expect(html).not.toContain('<button')
  })

  it('builds a join link for the room code', () => {
    expect(howToPlayJoinUrl('https://play.example', 'ab12')).toBe(
      'https://play.example/player/?room=AB12',
    )
    expect(howToPlayJoinUrl('', 'AB12')).toBe('')
    const src = howToPlayQrSrc('https://play.example/player/?room=AB12')
    expect(src).toContain('data=')
    expect(howToPlayQrSrc('')).toBeNull()
  })
})
