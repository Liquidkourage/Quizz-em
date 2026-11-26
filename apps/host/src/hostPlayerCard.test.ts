import { describe, expect, it } from 'vitest'
import { firstMatchingPlayer, handHistoryText, handoffPhoneChoices, hostPlayerCard, playerAttention, undoBetOffered, type HostPlayerCardInput } from './hostPlayerCard'

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

describe('player marks and find', () => {
  it('dims an offline phone, rings the person to act, and leaves an empty guess unmarked until answering', () => {
    expect(playerAttention({ phone: 'offline', toAct: true, phase: 'betting', guess: null, guessLocked: false })).toEqual({
      offline: true,
      toAct: true,
      noGuess: false,
    })
    expect(playerAttention({ phone: 'connected', toAct: false, phase: 'answering', guess: null, guessLocked: false }).noGuess).toBe(true)
    expect(firstMatchingPlayer([{ name: 'Ada' }, { name: 'Bo' }], 'bo', (name) => name)?.name).toBe('Bo')
    expect(firstMatchingPlayer([{ name: 'Ada' }], '  ', (name) => name)).toBeNull()
  })
})

describe('hand history text', () => {
  it('reads the guess, the chips, and the stack for one finished question', () => {
    const text = handHistoryText({
      playerId: 'ada',
      questionNum: 3,
      prompt: 'How many moons?',
      guess: 14,
      guessLabel: 'sent',
      offBy: 4,
      chips: 'won',
      amount: 40,
      stackAfter: 520,
      pointsGained: 60,
    })
    expect(text.title).toBe('Question 3')
    expect(text.prompt).toBe('How many moons?')
    expect(text.detail).toBe('Guess 14 · Off by 4 · Won $40 · Stack $520 · +60 points')
  })
})

describe('host desk rulings', () => {
  it('offers a late points phone when the waiting room is empty', () => {
    expect(
      handoffPhoneChoices(
        [],
        [{ id: 'human:dee', name: 'Dee Moss', handoff: true }],
        (name) => name,
      ),
    ).toEqual([{ id: 'human:dee', name: 'Dee Moss' }])
  })

  it('offers undo only while that player still has a bet to give back', () => {
    expect(undoBetOffered('betting', true)).toBe(true)
    expect(undoBetOffered('betting', false)).toBe(false)
    expect(undoBetOffered('answering', true)).toBe(false)
  })
})
