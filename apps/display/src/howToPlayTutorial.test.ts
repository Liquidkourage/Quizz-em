import { readFileSync } from 'node:fs'
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
    expect(frame.stepLabel).toBe('Step 1 of 9')
    expect(frame.holeFaces).toEqual(['hidden', 'hidden'])
    expect(frame.boardFaces.every((face) => face === 'hidden')).toBe(true)
    expect(frame.answerRevealed).toBe(false)
    expect(frame.showCallout).toBe(false)
    expect(frame.showOutcome).toBe(false)
  })

  it('deals two private cards, then offers check, call, raise, or fold', () => {
    expect(howToPlayFrame(1).holeFaces).toEqual(['shown', 'shown'])
    const bet = howToPlayFrame(2)
    expect(bet.showCallout).toBe(true)
    expect(bet.callout).toBe('Check, call, or raise')
    expect(bet.description).toContain('fold')
    expect(bet.boardFaces.every((face) => face === 'hidden')).toBe(true)
  })

  it('shows an all-in as the whole stack in the main pot', () => {
    const allIn = howToPlayFrame(3)
    expect(allIn.callout).toBe('All-in')
    expect(allIn.pots).toEqual([{ label: 'Main pot', amount: '$400' }])
    expect(allIn.description).toContain('whole stack')
  })

  it('deals five shared cards, then allows another raise', () => {
    expect(howToPlayFrame(4).boardFaces).toEqual(['shown', 'shown', 'shown', 'shown', 'shown'])
    const second = howToPlayFrame(5)
    expect(second.callout).toBe('Raise or fold?')
    expect(second.segmentLabel).toBe('Community')
  })

  it('splits a short all-in into a main pot and a side pot', () => {
    const side = howToPlayFrame(6)
    expect(side.pots).toEqual([
      { label: 'Main pot', amount: '$400' },
      { label: 'Side pot', amount: '$200' },
    ])
    expect(side.description).toContain('side pot')
    expect(side.showCallout).toBe(false)
  })

  it('builds 1,439.9 from five of the seven cards', () => {
    const frame = howToPlayFrame(7)
    expect(frame.answerRevealed).toBe(true)
    expect(frame.answerDigits).toEqual([1, 4, 3, 9, 9])
    expect(frame.decimalBefore).toBe(4)
    expect(frame.holeFaces).toEqual(['selected', 'selected'])
    expect(frame.boardFaces).toEqual(['selected', 'selected', 'selected', 'dimmed', 'dimmed'])
    expect(frame.hint).toContain('1,439.9')
  })

  it('shows the correct answer and that this guess wins the pot', () => {
    const frame = howToPlayFrame(8)
    expect(frame.showOutcome).toBe(true)
    expect(frame.submittedAnswer).toBe('1,439.9')
    expect(frame.correctAnswer).toBe('1,440')
    expect(frame.outcomeDetail).toContain('0.1')
    expect(frame.outcomeDetail).toContain('side pot')
    expect(frame.segmentLabel).toBe('Winner')
    expect(frame.stepLabel).toBe('Step 9 of 9')
  })

  it('loops back to the question after the last step', () => {
    expect(howToPlayFrame(HOW_TO_PLAY_STEPS.length).stepIndex).toBe(0)
    expect(howToPlayFrame(-1).stepIndex).toBe(HOW_TO_PLAY_STEPS.length - 1)
  })

  it('shows the opening beat on the TV with nothing to tap', () => {
    const html = renderToStaticMarkup(createElement(VenueSeatingRulesWall, { step: 0, venueCode: 'AB12' }))
    expect(html).toContain('How many minutes are in a day?')
    expect(html).toContain('Every round starts with a trivia question.')
    expect(html).toContain('Step 1 of 9')
    expect(html).toContain('Room AB12')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('1,440')
  })

  it('shows the side pot on the felt', () => {
    const html = renderToStaticMarkup(createElement(VenueSeatingRulesWall, { step: 6 }))
    expect(html).toContain('Main pot')
    expect(html).toContain('$400')
    expect(html).toContain('Side pot')
    expect(html).toContain('$200')
    expect(html).not.toContain('<button')
  })

  it('shows the winning beat without a control on the glass', () => {
    const html = renderToStaticMarkup(createElement(VenueSeatingRulesWall, { step: 8 }))
    expect(html).toContain('1,439.9')
    expect(html).toContain('1,440')
    expect(html).toContain('side pot')
    expect(html).not.toContain('<button')
  })

  it('builds a join link for the room code', () => {
    expect(howToPlayJoinUrl('https://play.example', 'ab12')).toBe(
      'https://play.example/player/?room=AB12',
    )
    expect(howToPlayJoinUrl('', 'AB12')).toBe('')
    const src = howToPlayQrSrc('https://play.example/player/?room=AB12')
    expect(src).toContain('data=')
    expect(src).toContain('size=640x640')
    expect(howToPlayQrSrc('')).toBeNull()
    const hand = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    const handQr = hand.slice(hand.indexOf('.htp-qr {'), hand.indexOf('.htp-qr--empty'))
    expect(handQr).toContain('13.5rem')
    const event = readFileSync(new URL('./eventOverview.css', import.meta.url), 'utf8')
    const eventQr = event.slice(event.indexOf('.evt-qr {'), event.indexOf('.evt-qr img'))
    expect(eventQr).toContain('200px')
  })
})
