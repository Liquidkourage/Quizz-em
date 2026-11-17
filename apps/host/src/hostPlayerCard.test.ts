import { describe, expect, it } from 'vitest'
import { hostPlayerCard, type HostPlayerCardInput } from './hostPlayerCard'

function card(over: Partial<HostPlayerCardInput> = {}) {
  return hostPlayerCard({
    tableNum: 2,
    seatIndex: 0,
    phone: 'offline',
    offlineSec: 125,
    stack: 1200,
    inPot: 40,
    status: 'in the hand',
    toAct: true,
    lastAction: 'Ada called $20',
    phase: 'betting',
    guess: null,
    guessLocked: false,
    triviaPoints: 18,
    correctAnswer: null,
    ...over,
  })
}

function value(lines: { label: string; value: string }[], label: string): string | undefined {
  return lines.find((line) => line.label === label)?.value
}

describe('hostPlayerCard', () => {
  it('shows the chair, the phone, and the chips for a player the table is waiting on', () => {
    const lines = card()
    expect(value(lines, 'Place')).toBe('Table 2, seat 1')
    expect(value(lines, 'Phone')).toBe('Offline for 2 min')
    expect(value(lines, 'Stack')).toBe('$1,200')
    expect(value(lines, 'In the pot')).toBe('$40')
    expect(value(lines, 'Status')).toBe('In the hand')
    expect(value(lines, 'Turn')).toBe('Waiting on them')
    expect(value(lines, 'Last action')).toBe('Ada called $20')
    expect(value(lines, 'Trivia points')).toBe('18')
    expect(value(lines, 'Guess')).toBeUndefined()
    expect(lines.map((line) => line.label)).not.toContain('Hole cards')
  })

  it('shows a locked guess and hides how far off it is until the answer is revealed', () => {
    const hidden = card({ phase: 'answering', guess: 1200, guessLocked: true, correctAnswer: 1180, toAct: false })
    expect(value(hidden, 'Guess')).toBe('1200')
    expect(value(hidden, 'Off by')).toBeUndefined()
    const shown = card({ phase: 'reveal', guess: 1200, guessLocked: true, correctAnswer: 1180, toAct: false })
    expect(value(shown, 'Guess')).toBe('1200')
    expect(value(shown, 'Off by')).toBe('20')
  })

  it('says the guess is still open, or that nothing was sent', () => {
    expect(value(card({ phase: 'answering', guess: null, guessLocked: false }), 'Guess')).toBe('Still open')
    expect(value(card({ phase: 'showdown', guess: null, guessLocked: false }), 'Guess')).toBe('Nothing sent')
  })

  it('says a waiting player has a connected phone and no chair', () => {
    const lines = card({
      tableNum: null,
      seatIndex: null,
      phone: 'connected',
      offlineSec: null,
      stack: 1000,
      inPot: null,
      status: 'waiting',
      toAct: false,
      lastAction: null,
      phase: null,
    })
    expect(value(lines, 'Place')).toBe('Waiting')
    expect(value(lines, 'Phone')).toBe('Connected')
    expect(value(lines, 'In the pot')).toBeUndefined()
    expect(value(lines, 'Turn')).toBeUndefined()
  })
})
