import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow, HostVenueSeatContest } from '@qhe/net'
import { HostGuessList, HostLiveGuesses, hostGuessLines } from './hostLiveGuesses'

function seat(name: string, extra: Partial<HostVenueSeatContest> = {}): HostVenueSeatContest {
  return { name, kind: 'pot', reason: null, ...extra }
}

function row(phase: string, seats: HostVenueSeatContest[]): HostVenueActionRow {
  return {
    tableNum: 3,
    phase,
    seated: seats.length,
    pot: 0,
    actingSeatIndex: null,
    actingPlayerName: null,
    actingSummary: null,
    recentActions: [],
    inPotCount: seats.length,
    pointsOnlyCount: 0,
    seats,
  }
}

describe('host guess list', () => {
  it('lists a locked guess, someone still waiting, and the new number after a change', () => {
    const waiting = hostGuessLines(
      [row('answering', [seat('Ada', { guessLocked: true, guess: 42 }), seat('Bo', { guessLocked: false })])],
      100,
    )
    expect(waiting.map((line) => [line.name, line.guess, line.waiting, line.distance])).toEqual([
      ['Ada', 42, false, null],
      ['Bo', null, true, null],
    ])
    const changed = hostGuessLines(
      [row('answering', [seat('Ada', { guessLocked: true, guess: 99 }), seat('Bo', { guessLocked: false })])],
      100,
    )
    expect(changed[0]?.guess).toBe(99)
  })

  it('shows how far off each guess is only after the answer is revealed', () => {
    const revealed = hostGuessLines(
      [row('reveal', [seat('Ada', { guess: 90 }), seat('Bo')])],
      100,
    )
    expect(revealed[0]?.distance).toBe(10)
    expect(revealed[1]?.waiting).toBe(false)
    expect(revealed[1]?.distance).toBeNull()
    const guessing = hostGuessLines([row('answering', [seat('Ada', { guessLocked: true, guess: 90 })])], 100)
    expect(guessing[0]?.distance).toBeNull()
  })

  it('leaves a betting table off the list', () => {
    expect(hostGuessLines([row('betting', [seat('Ada', { guess: 1 })])], 1)).toEqual([])
  })

  it('offers one Guesses button while a table is guessing', () => {
    const html = renderToStaticMarkup(
      createElement(HostLiveGuesses, {
        rows: [row('answering', [seat('Ada', { guessLocked: true, guess: 42 })])],
        correct: 100,
      }),
    )
    expect(html).toContain('Guesses')
    expect(html).not.toContain('Ada')
  })

  it('reads the list as table, name, number, and distance', () => {
    const html = renderToStaticMarkup(
      createElement(HostGuessList, {
        lines: hostGuessLines(
          [row('showdown', [seat('Ada', { guess: 90 }), seat('Bo')])],
          100,
        ),
      }),
    )
    expect(html).toContain('Table 3')
    expect(html).toContain('Ada')
    expect(html).toContain('90')
    expect(html).toContain('off by 10')
    expect(html).toContain('Bo')
    expect(html).toContain('—')
    expect(html).not.toContain('Waiting')
  })
})
