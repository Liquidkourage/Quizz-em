import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueActionRow, HostVenueFeltBeatRow, HostVenueFloorBriefPayload } from '@qhe/net'
import {
  HostTableContest,
  HostTableOpen,
  HostVenueFloorBriefPanel,
  TableActionHoverSheet,
  tableActionHoverOrigin,
} from './hostDeskLayout'

function actionRow(tableNum: number): HostVenueActionRow {
  return {
    tableNum,
    phase: 'lobby',
    seated: 4,
    pot: 0,
    actingSeatIndex: null,
    actingPlayerName: null,
    actingSummary: null,
    recentActions: [],
    inPotCount: 4,
    pointsOnlyCount: 0,
    seats: [],
  }
}

function brief(): HostVenueFloorBriefPayload {
  return {
    actionRows: [1, 2, 3, 4].map((n) =>
      n === 1
        ? {
            ...actionRow(n),
            pot: 1020,
            actingSummary: 'Answering on phones',
            pointsOnlyCount: 1,
            seats: [{ name: 'Ada L.', kind: 'pot' as const, reason: null }],
            recentActions: [{ seat: 0, name: 'Ned P.', action: 'call' as const }],
          }
        : actionRow(n),
    ),
    moveLog: [],
    busts: [],
    bigWinners: [],
    bigBets: [],
    handBets: [],
    bigWinMinAmount: 300,
    fieldPlayerCount: 16,
    liveTableCount: 4,
    roster: [],
    venueHeld: false,
    shuffleEveryHands: 5,
    venueShuffleHeld: false,
    handsUntilShuffle: 5,
  }
}

describe('venue floor now', () => {
  it('shows stack, pot commitment, and status when a table action square is hovered', () => {
    const floor = brief()
    floor.actionRows = [
      {
        ...actionRow(1),
        phase: 'betting',
        actingPlayerName: 'Ada Lane',
        seats: [
          { name: 'Ada Lane', kind: 'pot', reason: null, bankroll: 1200, invested: 40 },
          { name: 'Bo', kind: 'points', reason: 'folded', bankroll: 800, invested: 20 },
        ],
      },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    expect(html).not.toContain('table-action-roster')
    const sheet = renderToStaticMarkup(
      createElement(TableActionHoverSheet, {
        top: 20,
        left: 12,
        seats: floor.actionRows[0]!.seats ?? [],
        actingPlayerName: 'Ada Lane',
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(sheet).toContain('role="tooltip"')
    expect(sheet).toContain('text-[1.5rem]')
    expect(sheet).not.toContain('text-xs')
    expect(sheet).toContain('Ada Lane')
    expect(sheet).toContain('aria-label="$1,200"')
    expect(sheet).toContain('aria-label="$40"')
    expect(sheet).toContain('To act')
    expect(sheet).toContain('Folded')
    expect(sheet).toContain('aria-label="$800"')
    const pointsSheet = renderToStaticMarkup(
      createElement(TableActionHoverSheet, {
        top: 20,
        left: 12,
        pot: 20,
        seats: [
          { name: 'Maria A.', kind: 'pot', reason: null, bankroll: 960, invested: 0 },
          { name: 'Jamal A.', kind: 'points', reason: 'busted', bankroll: 0, invested: 0, answerPoints: 185.59 },
          { name: 'Elena C.', kind: 'points', reason: 'busted', bankroll: 0, invested: 0, answerPoints: 281.81 },
          { name: 'Opal A.', kind: 'points', reason: null, offFelt: true },
        ],
        actingPlayerName: null,
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(pointsSheet).toContain('aria-label="$20"')
    expect(pointsSheet).toContain('aria-label="$960"')
    expect(pointsSheet).toContain('185.59 pts')
    expect(pointsSheet).toContain('281.81 pts')
    expect(pointsSheet).toContain('Points')
    expect(pointsSheet).not.toContain('Busted')
    expect(pointsSheet).toContain('Jamal A.')
    expect(pointsSheet).toContain('Elena C.')
    expect(pointsSheet).not.toContain('Opal A.')
    expect(pointsSheet).not.toContain('Not on the felt')
    expect(sheet).toContain('aria-label="$20"')
  })

  it('parks the hover window under the square, and above it when the floor runs out', () => {
    expect(tableActionHoverOrigin({ left: 10, top: 40, bottom: 80 }, { width: 800, height: 600 })).toEqual({
      top: 86,
      left: 10,
      above: false,
    })
    const nearEdge = tableActionHoverOrigin({ left: 900, top: 40, bottom: 80 }, { width: 800, height: 600 })
    expect(nearEdge.left).toBeLessThan(800)
    expect(
      tableActionHoverOrigin({ left: 10, top: 520, bottom: 560 }, { width: 800, height: 600 }).above,
    ).toBe(true)
  })

  it('shows each table pot on the action square', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: brief(),
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const card = (tableNum: number) => {
      const start = html.indexOf(`Open table ${tableNum}`)
      const next = html.indexOf('Open table', start + 1)
      return html.slice(start, next === -1 ? undefined : next)
    }
    expect(card(1)).toContain('aria-label="$1,020"')
    expect(card(2)).toContain('aria-label="$0"')
  })

  it('keeps a folded short stack inside the one pot everyone still in can win', () => {
    const seats = [
      { name: 'Elena B.', kind: 'pot' as const, reason: null, invested: 1000, bankroll: 0 },
      { name: 'Blake C.', kind: 'pot' as const, reason: null, invested: 1000, bankroll: 0 },
      { name: 'Liam A.', kind: 'pot' as const, reason: null, invested: 1000, bankroll: 0 },
      { name: 'Hugo C.', kind: 'pot' as const, reason: null, invested: 1000, bankroll: 0 },
      { name: 'Liam B.', kind: 'pot' as const, reason: null, invested: 1000, bankroll: 0 },
      { name: 'Priya B.', kind: 'points' as const, reason: 'folded' as const, invested: 20, bankroll: 980 },
    ]
    const floor = brief()
    floor.actionRows = [{ ...actionRow(1), pot: 5020, phase: 'betting', seats }]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const start = html.indexOf('Open table 1')
    const card = html.slice(start, html.indexOf('</button>', start))
    expect(card).toContain('aria-label="$5,020"')
    expect(card).not.toContain('>Main<')
    expect(card).not.toContain('>Side<')
    expect(card).not.toContain('of which')
    const open = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats,
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
        pot: 5020,
      }),
    )
    expect(open).toContain('aria-label="$5,020"')
    expect(open).not.toContain('>Main<')
    expect(open).not.toContain('>Side<')
    expect(open).not.toContain('Elena B.<sup')
    expect(open).not.toContain('Priya B.<sup')
    expect(open).not.toContain('of which')
  })

  it('marks every side pot a player can win, each in its own color', () => {
    const seats = [
      { name: 'Ada', kind: 'pot' as const, reason: null, invested: 100, bankroll: 0 },
      { name: 'Bea', kind: 'pot' as const, reason: null, invested: 300, bankroll: 0 },
      { name: 'Cy', kind: 'pot' as const, reason: null, invested: 300, bankroll: 0 },
      { name: 'Dee', kind: 'pot' as const, reason: null, invested: 600, bankroll: 0 },
      { name: 'Eve', kind: 'pot' as const, reason: null, invested: 600, bankroll: 0 },
    ]
    const open = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats,
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
        pot: 1900,
      }),
    )
    const dee = open.slice(open.indexOf('Dee'), open.indexOf('Dee') + 500)
    expect(dee).toContain('color:#7dd3fc">1</sup>')
    expect(dee).toContain('color:#ea580c;margin-left:0.12em">2</sup>')
    const bea = open.slice(open.indexOf('Bea'), open.indexOf('Bea') + 400)
    expect(bea).toContain('color:#7dd3fc">1</sup>')
    expect(bea).not.toContain('>2</sup>')
    const ada = open.slice(open.indexOf('Ada'), open.indexOf('Ada') + 80)
    expect(ada).not.toContain('side-pot-mark')
  })

  it('lays tables across the width and keeps the notes in one strip', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: brief(),
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const tables = html.indexOf('T1')
    const busts = html.indexOf('Busts')
    expect(html).toContain('host-live-floor flex h-full min-h-0 flex-col gap-2 overflow-y-auto')
    expect(html.match(/overflow-y-auto/g)).toHaveLength(1)
    expect(html).not.toContain('max-h-[40%]')
    expect(html).toContain('host-hand-lists')
    expect(html).toContain('minmax(7.5rem,9rem)')
    expect(html).toContain('text-base font-bold text-white/90')
    expect(html).toContain('text-base text-white/50')
    expect(html).toContain('px-1.5 py-0.5')
    expect(html).not.toContain('lg:grid-cols-4')
    expect(html).toContain('sm:grid-cols-3')
    expect(html).not.toContain('grid grid-cols-2 gap-3')
    expect(tables).toBeGreaterThan(-1)
    expect(html).toContain('This hand')
    expect(html).not.toContain('acting')
    expect(html).not.toContain('busts, big bets')
    expect(html).toContain('None this hand.')
    expect(html).toContain('host-hand-lists order-first')
    expect(busts).toBeGreaterThan(html.indexOf('This hand'))
    expect(html).toContain('Open table 1')
    expect(html).toContain('4 in pot')
    expect(html).toContain('1 out')
    expect(html).not.toContain('>Open<')
    expect(html).not.toContain('points only')
    expect(html).not.toContain('Answering on phones')
    expect(html).not.toContain('Ada L.')
    expect(html).not.toContain('aria-label="Table players"')
    expect(html).not.toContain('Ned P.')
    expect(html).not.toContain('>You<')
    expect(html).not.toContain('>Focus<')
    expect(html).not.toContain('ring-emerald-400/50')
  })

  it('colors each table by phase and says when betting is finished', () => {
    const floor = brief()
    floor.actionRows = [
      { ...actionRow(1), phase: 'lobby' },
      { ...actionRow(2), phase: 'betting', betsClosed: false },
      { ...actionRow(3), phase: 'betting', betsClosed: true },
      { ...actionRow(4), phase: 'answering' },
      { ...actionRow(5), phase: 'question' },
      { ...actionRow(6), phase: 'reveal' },
      { ...actionRow(7), phase: 'showdown' },
      { ...actionRow(8), phase: 'payout' },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const card = (tableNum: number) => {
      const start = html.indexOf(`Open table ${tableNum}`)
      const next = html.indexOf('Open table', start + 1)
      return html.slice(start, next === -1 ? undefined : next)
    }
    const waiting = card(1)
    const open = card(2)
    const closed = card(3)
    expect(waiting).toContain('Waiting room')
    expect(waiting).toContain('border-slate-400/35')
    expect(open).toContain('>Betting<')
    expect(open).toContain('border-orange-400/50')
    expect(open).not.toContain('No more bets')
    expect(closed).toContain('No more bets')
    expect(closed).toContain('border-teal-300/60')
    expect(card(4)).toContain('Guessing')
    expect(card(4)).toContain('border-violet-400/45')
    expect(card(4)).not.toContain('submitted')
    expect(card(5)).toContain('Deal / question')
    expect(card(5)).toContain('border-sky-400/45')
    expect(card(6)).toContain('Answer reveal')
    expect(card(6)).toContain('border-pink-400/45')
    expect(card(7)).toContain('Results')
    expect(card(7)).toContain('border-emerald-400/40')
    expect(card(8)).toContain('Paying out')
    expect(card(8)).toContain('border-yellow-300/50')
    const tones = [
      'border-slate-400/35',
      'border-orange-400/50',
      'border-teal-300/60',
      'border-violet-400/45',
      'border-sky-400/45',
      'border-pink-400/45',
      'border-emerald-400/40',
      'border-yellow-300/50',
    ]
    expect(new Set(tones).size).toBe(tones.length)
  })

  it('shows how many players have submitted while a table is guessing', () => {
    const floor = brief()
    floor.actionRows = [
      { ...actionRow(1), phase: 'answering', answersSubmitted: 2, answersExpected: 5 },
      { ...actionRow(2), phase: 'betting' },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const guessing = html.slice(html.indexOf('Open table 1'), html.indexOf('Open table 2'))
    const betting = html.slice(html.indexOf('Open table 2'))
    expect(guessing).toContain('2/5 submitted')
    expect(betting).not.toContain('submitted')
  })

  it('shows the shared answer clock on a guessing table card', () => {
    const floor = brief()
    floor.actionRows = [{ ...actionRow(3), phase: 'answering', answersSubmitted: 8, answersExpected: 8 }]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        feltRows: [
          {
            tableNum: 3,
            active: true,
            seated: 8,
            phase: 'answering',
            street: 'Trivia lock-in',
            clock: 'Countdown',
            answerDeadlineMs: Date.now() + 12_000,
            turnDeadlineMs: null,
            phaseStrictSig: 'answer',
          },
        ],
      }),
    )
    expect(html).toContain('Answer clock')
    expect(html).toMatch(/Answer clock \d+/)
  })

  it('offers a nudge on the table that is waiting for a player to act', () => {
    const floor = brief()
    floor.actionRows = [
      { ...actionRow(1), phase: 'betting', actingPlayerName: 'Ada Lane' },
      { ...actionRow(2), phase: 'betting', betsClosed: true, actingPlayerName: 'Bo' },
      { ...actionRow(3), phase: 'answering', actingPlayerName: 'Cy' },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        onNudgeTable: () => {},
        onSkipTable: () => {},
      }),
    )
    const waiting = html.slice(html.indexOf('Open table 1'), html.indexOf('Open table 2'))
    const closed = html.slice(html.indexOf('Open table 2'), html.indexOf('Open table 3'))
    const guessing = html.slice(html.indexOf('Open table 3'))
    expect(waiting).toContain('Nudge Ada Lane on table 1')
    expect(waiting).toContain('Fold Ada Lane on table 1')
    expect(closed).not.toContain('Nudge')
    expect(closed).not.toContain('Fold')
    expect(guessing).not.toContain('Nudge')
    expect(guessing).not.toContain('Fold')
  })

  it('offers last call on an open betting table and shows stack and pot investment', () => {
    const floor = brief()
    floor.actionRows = [
      {
        ...actionRow(1),
        phase: 'betting',
        actingPlayerName: 'Ada Lane',
        pot: 80,
        seats: [{ name: 'Ada Lane', kind: 'pot', reason: null, bankroll: 1200, invested: 40 }],
      },
      { ...actionRow(2), phase: 'betting', betsClosed: true, actingPlayerName: 'Bo' },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        onLastCall: () => {},
      }),
    )
    expect(html).toContain('Last call on betting tables')
    expect(html).toContain('Last call on table 1')
    expect(html).not.toContain('Last call on table 2')
    const table = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: floor.actionRows[0]!.seats,
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
        pot: 80,
      }),
    )
    expect(table).toContain('$1,200')
    expect(table).toContain('in pot')
    expect(table).toContain('$40')
  })

  it('shows the nudge clock on the table action card that was nudged', () => {
    const floor = brief()
    floor.actionRows = [
      { ...actionRow(1), phase: 'betting', actingPlayerName: 'Ada Lane' },
      { ...actionRow(2), phase: 'betting', actingPlayerName: 'Bo' },
    ]
    const felt = (tableNum: number, turnDeadlineMs: number | null): HostVenueFeltBeatRow => ({
      tableNum,
      active: true,
      seated: 4,
      phase: 'betting',
      street: 'Pre-board',
      clock: 'Clock open',
      answerDeadlineMs: null,
      turnDeadlineMs,
      phaseStrictSig: 'bet',
    })
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        feltRows: [felt(1, Date.now() + 30_000), felt(2, null)],
      }),
    )
    const nudged = html.slice(html.indexOf('Open table 1'), html.indexOf('Open table 2'))
    const other = html.slice(html.indexOf('Open table 2'))
    expect(nudged).toContain('Nudge clock 30')
    expect(other).not.toContain('Nudge clock')
  })

  it('counts up on the table action card since that table last acted', () => {
    const now = Date.now()
    const hand = now - 40_000
    const floor = brief()
    floor.handStartedAtMs = hand
    floor.actionRows = [
      { ...actionRow(1), phase: 'betting', actingPlayerName: 'Ada' },
      { ...actionRow(2), phase: 'betting', actingPlayerName: 'Bo' },
      { ...actionRow(3), phase: 'lobby' },
    ]
    floor.moveLog = [
      {
        id: 'a',
        atMs: now - 12_000,
        tableNum: 1,
        playerName: 'Ada',
        kind: 'call',
        summary: 'Ada called',
      },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const first = html.slice(html.indexOf('Open table 1'), html.indexOf('Open table 2'))
    const quiet = html.slice(html.indexOf('Open table 2'), html.indexOf('Open table 3'))
    const lobby = html.slice(html.indexOf('Open table 3'))
    expect(first).toContain('Last action 0:12')
    expect(first).toContain('>0:12<')
    expect(first).not.toContain('Since')
    expect(first).toContain('text-base')
    expect(first).not.toContain('text-2xl')
    expect(html).toContain('minmax(7.5rem,9rem)')
    expect(quiet).toContain('Last action 0:40')
    expect(quiet).not.toContain('Since')
    expect(lobby).not.toContain('Last action')
  })

  it('counts up from the last move when the hand clock has not started', () => {
    const now = Date.now()
    const floor = brief()
    floor.handStartedAtMs = null
    floor.actionRows = [{ ...actionRow(1), phase: 'betting', actingPlayerName: 'Ada' }]
    floor.moveLog = [
      {
        id: 'a',
        atMs: now - 12_000,
        tableNum: 1,
        playerName: 'Ada',
        kind: 'call',
        summary: 'Ada called',
      },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    expect(html).toContain('Last action 0:12')
    expect(html).not.toContain('Since')
  })

  it('drops each table clock once that table has finished acting', () => {
    const now = Date.now()
    const floor = brief()
    floor.handStartedAtMs = now - 40_000
    floor.actionRows = [
      { ...actionRow(1), phase: 'betting', actingPlayerName: 'Ada' },
      { ...actionRow(2), phase: 'betting', betsClosed: true, actingPlayerName: 'Bo' },
      { ...actionRow(3), phase: 'answering', answersSubmitted: 5, answersExpected: 5 },
      { ...actionRow(4), phase: 'answering', answersSubmitted: 2, answersExpected: 5, actingPlayerName: 'Cy' },
      { ...actionRow(5), phase: 'reveal' },
    ]
    const felt = (tableNum: number): HostVenueFeltBeatRow => ({
      tableNum,
      active: true,
      seated: 4,
      phase: 'betting',
      street: 'Pre-board',
      clock: 'Clock open',
      answerDeadlineMs: null,
      turnDeadlineMs: now + 30_000,
      phaseStrictSig: 'bet',
    })
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        feltRows: [felt(1), felt(2)],
      }),
    )
    const open = html.slice(html.indexOf('Open table 1'), html.indexOf('Open table 2'))
    const closed = html.slice(html.indexOf('Open table 2'), html.indexOf('Open table 3'))
    const guessed = html.slice(html.indexOf('Open table 3'), html.indexOf('Open table 4'))
    const guessing = html.slice(html.indexOf('Open table 4'), html.indexOf('Open table 5'))
    const reveal = html.slice(html.indexOf('Open table 5'))
    expect(open).toContain('Last action')
    expect(open).toContain('Nudge clock')
    expect(closed).not.toContain('Last action')
    expect(closed).not.toContain('Nudge clock')
    expect(guessed).not.toContain('Last action')
    expect(guessing).not.toContain('Last action')
    expect(reveal).not.toContain('Last action')
  })

  it('lists table action in numerical order', () => {
    const floor = brief()
    floor.actionRows = [
      { ...actionRow(4), interestingAction: true },
      actionRow(1),
      actionRow(3),
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: floor,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    const t1 = html.indexOf('Open table 1')
    const t3 = html.indexOf('Open table 3')
    const t4 = html.indexOf('Open table 4')
    expect(t1).toBeGreaterThan(-1)
    expect(t1).toBeLessThan(t3)
    expect(t3).toBeLessThan(t4)
  })

  it('shows who has submitted a guess on the opened table', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [
          { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
          { name: 'Bo', kind: 'pot', reason: null, guessLocked: false },
        ],
        recentActions: [],
        phaseLabel: 'Guessing · 1/2 submitted',
        hostPlayerLabel: (name: string) => name,
      }),
    )
    const submitted = html.indexOf('>Submitted<')
    const missing = html.indexOf('>Not submitted<')
    expect(html.slice(0, submitted)).toContain('Ada')
    expect(html.slice(submitted, missing)).toContain('Bo')
    expect(submitted).toBeGreaterThan(-1)
    expect(missing).toBeGreaterThan(submitted)
  })

  it('leaves a player past the felt off the opened table', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [
          { name: 'Ada', kind: 'pot', reason: null, guessLocked: true },
          { name: 'Ivy', kind: 'points', reason: null, offFelt: true },
        ],
        players: [
          { playerId: 'human:a', name: 'Ada' },
          { playerId: 'human:i', name: 'Ivy' },
        ],
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(html).toContain('Ada')
    expect(html).not.toContain('Ivy')
    expect(html).not.toContain('Not on the felt')
  })

  it('opens a table into in-pot and points-only columns', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableContest, {
        seats: [
          { name: 'Ada L.', kind: 'pot', reason: null },
          { name: 'Bo K.', kind: 'points', reason: 'folded' },
        ],
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(html).toContain('grid-cols-2')
    expect(html.indexOf('Ada L.')).toBeGreaterThan(html.indexOf('In pot'))
    expect(html.indexOf('Bo K.')).toBeGreaterThan(html.indexOf('Points only'))
    expect(html).toContain('Folded')
  })

  it('draws the opened table larger than the raw dialog type', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [{ name: 'Ada Lane', kind: 'pot', reason: null, bankroll: 1200, invested: 40 }],
        recentActions: [{ seat: 0, name: 'Ada Lane', action: 'call' }],
        hostPlayerLabel: (name: string) => name,
        phaseLabel: 'To act',
        pot: 40,
      }),
    )
    expect(html).toContain('host-table-open')
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    const names = css.slice(css.indexOf('.host-table-open .text-sm'), css.indexOf('.host-table-open .text-sm') + 160)
    const labels = css.slice(css.indexOf('.host-table-open .text-xs'), css.indexOf('.host-table-open .text-xs') + 160)
    expect(names).toContain('font-size: 1.3125rem')
    expect(labels).toContain('font-size: 1.125rem')
  })

  it('moves and removes a player from the contest row they already occupy', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [
          { name: 'Ada Lane', kind: 'pot' as const, reason: null },
          { name: 'Bo Kent', kind: 'points' as const, reason: 'folded' as const },
        ],
        recentActions: [],
        tableNum: 2,
        players: [
          { playerId: 'human:a', name: 'Ada Lane' },
          { playerId: 'human:b', name: 'Bo Kent' },
          { playerId: 'human:c', name: 'Cara Moss' },
        ],
        onMove: () => {},
        onRemove: () => {},
        hostPlayerLabel: (name: string) => name,
      }),
    )
    const pot = html.indexOf('In pot')
    const adaMove = html.indexOf('Move Ada Lane to')
    const points = html.indexOf('Points only')
    const boMove = html.indexOf('Move Bo Kent to')
    const caraMove = html.indexOf('Move Cara Moss to')
    expect(html).not.toContain('>Players<')
    expect(pot).toBeLessThan(adaMove)
    expect(adaMove).toBeLessThan(points)
    expect(points).toBeLessThan(boMove)
    expect(pot).toBeLessThan(caraMove)
    expect(caraMove).toBeLessThan(points)
    expect(html).toContain('>Remove<')
  })

  it('numbers two players who share a name on the opened table', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [
          { name: 'Alice C.', kind: 'pot', reason: null },
          { name: 'Alice C.', kind: 'pot', reason: null },
        ],
        recentActions: [],
        hostPlayerLabel: (name: string) => name,
      }),
    )
    expect(html).toContain('Alice C. 2')
  })

  it('puts recent actions beside the roster', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [],
        recentActions: [{ seat: 1, name: 'Ned P.', action: 'call', amount: 40 }],
        phaseLabel: 'Guessing',
        pot: 1020,
        actingSummary: 'Answering on phones',
        hostPlayerLabel: (name: string) => name,
      }),
    )
    const actions = html.slice(html.indexOf('grid-cols-3'), html.indexOf('</ul>'))
    expect(actions).toContain('Ned P.')
    expect(actions).toContain('Call')
    expect(actions).toContain('aria-label="$40"')
    expect(actions).toContain('whitespace-nowrap')
    expect(actions).not.toContain('<p ')
    expect(html).toContain('Answering on phones')
    expect(html).toContain('1,020')
  })

  it('fills recent actions from this table’s move log', () => {
    const html = renderToStaticMarkup(
      createElement(HostTableOpen, {
        seats: [],
        recentActions: [{ seat: 1, name: 'Old Snap', action: 'check' }],
        tableNum: 1,
        moves: [
          { id: '6', atMs: 6, tableNum: 1, playerName: 'Fay', kind: 'submit', summary: 'Fay submitted 42' },
          { id: '5', atMs: 5, tableNum: 1, playerName: 'Eve', kind: 'fold', summary: 'Eve folded (points only)' },
          { id: '4', atMs: 4, tableNum: 1, playerName: 'Dan', kind: 'allIn', summary: 'Dan is all-in for $200' },
          { id: '3', atMs: 3, tableNum: 1, playerName: 'Cara', kind: 'raise', summary: 'Cara raised to $1,020' },
          { id: '2', atMs: 2, tableNum: 2, playerName: 'Bo', kind: 'call', summary: 'Bo called $10' },
          { id: '1', atMs: 1, tableNum: 1, playerName: 'Ada', kind: 'bet', summary: 'Ada bet $40' },
        ],
        hostPlayerLabel: (name: string) => name,
      }),
    )
    const actions = html.slice(html.indexOf('grid-cols-3'), html.indexOf('</ul>'))
    expect(actions).toContain('Fay')
    expect(actions).toContain('Guess')
    expect(actions).toContain('Eve')
    expect(actions).toContain('Fold · points')
    expect(actions).toContain('Dan')
    expect(actions).toContain('All-in')
    expect(actions).toContain('aria-label="$200"')
    expect(actions).toContain('Cara')
    expect(actions).toContain('aria-label="$1,020"')
    expect(actions).toContain('Ada')
    expect(actions).toContain('>Bet<')
    expect(actions).toContain('aria-label="$40"')
    expect(actions).not.toContain('Old Snap')
    expect(actions).not.toContain('>Bo<')
  })

  it('marks a table only when it is the whole public display', () => {
    const one = brief()
    one.liveTableCount = 1
    one.actionRows = [{ ...actionRow(3), seated: 4 }]
    one.wallView = 'floor'
    const alone = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: one,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    expect(alone).toContain('>Focus<')
    expect(alone).toContain('ring-sky-300/70')
    expect(alone.indexOf('>Focus<')).toBeGreaterThan(alone.indexOf('T3'))
    expect(alone.indexOf('>Focus<')).toBeLessThan(alone.indexOf('T3') + 400)

    one.wallView = 'leaderboard'
    const scores = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: one,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '3',
      }),
    )
    expect(scores).not.toContain('>Focus<')
  })

  it('lists big wins largest first', () => {
    const night = brief()
    night.bigWinners = [
      { name: 'Ned P.', tableNum: 2, amount: 120, atMs: 2 },
      { name: 'Ada L.', tableNum: 4, amount: 900, atMs: 1 },
    ]
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: night,
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
      }),
    )
    expect(html).toContain('Big wins this session')
    const wins = html.slice(html.indexOf('Big wins this session'))
    expect(wins.indexOf('Ada L.')).toBeGreaterThan(-1)
    expect(wins.indexOf('Ada L.')).toBeLessThan(wins.indexOf('Ned P.'))
  })

  it('keeps the blind call on the floor', () => {
    const html = renderToStaticMarkup(
      createElement(HostVenueFloorBriefPanel, {
        brief: brief(),
        hostPlayerLabel: (name: string) => name,
        hostTableId: '1',
        blindCall: createElement('p', null, 'Raise the blinds'),
      }),
    )
    expect(html).toMatch(/host-floor-toolbar[\s\S]*Raise the blinds/)
    expect(html.indexOf('host-floor-toolbar')).toBeLessThan(html.indexOf('Table action'))
  })
})
