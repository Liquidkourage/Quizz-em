import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow } from '@qhe/net'
import HostStillGuessingNotice from './HostStillGuessingNotice'
import { guessClockCatchUp, guessNudgeReady, playersStillGuessing } from './hostStillGuessing'
import { venueRevealAnswerBlockedHint } from './hostVenueActionGates'

function row(partial: Partial<HostVenueActionRow> & Pick<HostVenueActionRow, 'tableNum' | 'seats'>): HostVenueActionRow {
  return {
    phase: 'answering',
    seated: partial.seats.length,
    pot: 0,
    actingSeatIndex: null,
    actingPlayerName: null,
    actingSummary: null,
    recentActions: [],
    inPotCount: partial.seats.length,
    pointsOnlyCount: 0,
    ...partial,
  }
}

describe('players still guessing', () => {
  const rows = [
    row({
      tableNum: 2,
      seats: [
        { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
        { name: 'Bo', kind: 'pot', reason: null, guessLocked: false },
      ],
    }),
    row({
      tableNum: 4,
      seats: [{ name: 'Cy', kind: 'points', reason: 'folded', guessLocked: false }],
    }),
  ]

  it('stays quiet while any table is still betting', () => {
    const mixed = [
      rows[0]!,
      row({
        tableNum: 3,
        phase: 'betting',
        seats: [{ name: 'Dee', kind: 'pot', reason: null }],
      }),
    ]
    expect(playersStillGuessing(mixed)).toEqual({ contest: [], pointsOnly: [] })
  })

  it('keeps chip-contest guesses in the main list and points-only guesses in their own', () => {
    expect(playersStillGuessing(rows)).toEqual({
      contest: [{ name: 'Bo', tableNum: 2 }],
      pointsOnly: [{ name: 'Cy', tableNum: 4 }],
    })
  })

  it('drops a name when that guess locks and keeps a busted seat with the late entries', () => {
    const afterBo = [
      row({
        tableNum: 1,
        seats: [
          { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
          { name: 'Jamal', kind: 'points', reason: 'busted', guessLocked: false },
          { name: 'Elena', kind: 'points', reason: 'busted', guessLocked: true },
          { name: 'Ivy', kind: 'points', reason: null, offFelt: true, guessLocked: false },
          { name: 'Opal', kind: 'points', reason: null, offFelt: true, guessLocked: true },
        ],
      }),
      row({
        tableNum: 2,
        seats: [
          { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
          { name: 'Bo', kind: 'pot', reason: null, guessLocked: true },
        ],
      }),
      rows[1]!,
    ]
    expect(playersStillGuessing(afterBo)).toEqual({
      contest: [],
      pointsOnly: [
        { name: 'Ivy', tableNum: 1 },
        { name: 'Jamal', tableNum: 1 },
        { name: 'Cy', tableNum: 4 },
      ],
    })
  })
})

describe('reveal stays open for a late entry', () => {
  it('lists an open late entry under points only without holding Reveal', () => {
    expect(
      playersStillGuessing([
        row({
          tableNum: 1,
          answersSubmitted: 8,
          answersExpected: 8,
          seats: [
            { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
            { name: 'Ivy', kind: 'points', reason: null, offFelt: true, guessLocked: false },
          ],
        }),
      ]),
    ).toEqual({
      contest: [],
      pointsOnly: [{ name: 'Ivy', tableNum: 1 }],
    })
    expect(
      venueRevealAnswerBlockedHint(
        [
          {
            tableNum: 1,
            active: true,
            seated: 8,
            phase: 'answering',
            street: 'Answer',
            clock: 'Countdown',
            answerDeadlineMs: 10_000,
            phaseStrictSig: 'answer',
          },
        ],
        [{ tableNum: 1, answersSubmitted: 8, answersExpected: 8 }],
        1_000,
      ),
    ).toBeNull()
  })
})

describe('guess clock catch-up', () => {
  it('moves the desk clock to now when the answer deadline is already past', () => {
    expect(guessClockCatchUp([10_000], 10_500, 9_000)).toBe(10_500)
  })

  it('leaves the desk clock alone while the answer window is still open', () => {
    expect(guessClockCatchUp([10_000], 9_000, 8_000)).toBeNull()
  })

  it('leaves the desk clock alone once it has already passed the deadline', () => {
    expect(guessClockCatchUp([10_000], 10_500, 10_500)).toBeNull()
  })
})

describe('guess nudge timing', () => {
  it('waits until the answer timer has finished', () => {
    expect(guessNudgeReady([45_000], 44_999)).toBe(false)
    expect(guessNudgeReady([45_000], 45_000)).toBe(true)
  })

  it('waits for the last table still on the timer', () => {
    expect(guessNudgeReady([40_000, 45_000], 42_000)).toBe(false)
    expect(guessNudgeReady([40_000, 45_000], 45_000)).toBe(true)
  })

  it('stays closed when no answer timer is running', () => {
    expect(guessNudgeReady([], 45_000)).toBe(false)
  })
})

describe('still guessing notice', () => {
  it('shows the players who have not submitted', () => {
    const html = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        contest: [
          { name: 'Bo', tableNum: 2 },
          { name: 'Cy', tableNum: 4 },
        ],
        pointsOnly: [],
        nudgeReady: true,
      }),
    )
    expect(html).toContain('Still guessing')
    expect(html).toContain('Bo')
    expect(html).toContain('Table 2')
    expect(html).toContain('Cy')
    expect(html).toContain('fixed')
    expect(html).not.toContain('max-h-64')
    expect(html).not.toContain('grid-cols-2')
    expect(html).toContain('Nudge')
    expect(html).toContain('scores 0')
    expect(html).toContain('cannot win the pot')
    expect(html).toContain('Close still guessing')
    expect(html).not.toContain('Points only')
  })

  it('lists points-only players under their own heading', () => {
    const html = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        contest: [{ name: 'Bo', tableNum: 2 }],
        pointsOnly: [
          { name: 'Jamal A.', tableNum: 1 },
          { name: 'Ivy', tableNum: 1 },
        ],
        nudgeReady: true,
      }),
    )
    const bo = html.indexOf('Bo')
    const heading = html.indexOf('Points only')
    const jamal = html.indexOf('Jamal A.')
    expect(bo).toBeGreaterThan(-1)
    expect(heading).toBeGreaterThan(bo)
    expect(jamal).toBeGreaterThan(heading)
    expect(html).toContain('Ivy')
    expect(html).toContain('Table 1')
  })

  it('counts both groups when the notice is tucked away', () => {
    const html = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        contest: [{ name: 'Bo', tableNum: 2 }],
        pointsOnly: [{ name: 'Ivy', tableNum: 1 }],
        startClosed: true,
      }),
    )
    expect(html).toContain('Still guessing · 2')
    expect(html).not.toContain('Points only')
  })

  it('starts tucked away until the answer timer has finished', () => {
    const waiting = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        contest: [{ name: 'Bo', tableNum: 2 }],
        pointsOnly: [],
        nudgeReady: false,
      }),
    )
    expect(waiting).toContain('Still guessing · 1')
    expect(waiting).toContain('Show still guessing')
    expect(waiting).not.toContain('Bo')
    expect(waiting).not.toContain('Nudge')

    const ready = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        contest: [{ name: 'Bo', tableNum: 2 }],
        pointsOnly: [],
        nudgeReady: true,
      }),
    )
    expect(ready).toContain('Bo')
    expect(ready).toContain('Nudge')
  })

  it('tucks the notice away so the host can reopen it', () => {
    const html = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, {
        contest: [{ name: 'Bo', tableNum: 2 }],
        pointsOnly: [],
        startClosed: true,
      }),
    )
    expect(html).toContain('Show still guessing')
    expect(html).toContain('Still guessing')
    expect(html).not.toContain('Nudge gives them')
    expect(html).not.toContain('w-[min(24rem')
  })

  it('uses two columns when many players are still guessing', () => {
    const contest = Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i}`, tableNum: i + 1 }))
    const html = renderToStaticMarkup(
      createElement(HostStillGuessingNotice, { contest, pointsOnly: [], nudgeReady: true }),
    )
    expect(html).toContain('grid-cols-2')
    expect(html).toContain('Player 7')
    expect(html).not.toContain('max-h-64')
  })
})
