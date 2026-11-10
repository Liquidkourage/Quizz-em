import { describe, expect, it } from 'vitest'
import {
  advanceBlindLevel,
  applyBlindScheduleSave,
  applyStoredBlinds,
  blindsShownForVenue,
  clearVenueBlindNotice,
  getVenueBlindSettings,
  noteShownVenueBlinds,
  publishedTableBlinds,
  recordVenueHandCompleted,
  type VenueBlindSettings,
} from './venue-blind-settings'

function raised(): VenueBlindSettings {
  return {
    smallBlind: 40,
    bigBlind: 80,
    blindLevelIndex: 0,
    handsPerBlindLevel: 3,
    handsAtCurrentLevel: 1,
    levels: [
      { smallBlind: 10, bigBlind: 20 },
      { smallBlind: 15, bigBlind: 30 },
    ],
  }
}

describe('manual blind increases', () => {
  it('keeps the increase when the pace line saves the schedule', () => {
    const next = applyBlindScheduleSave(raised(), 3)
    expect(next.smallBlind).toBe(40)
    expect(next.bigBlind).toBe(80)
    expect(next.handsPerBlindLevel).toBe(3)
    expect(next.handsAtCurrentLevel).toBe(1)
  })

  it('keeps the increase on the next hand until the level actually changes', () => {
    const { next, leveledUp } = advanceBlindLevel(raised())
    expect(leveledUp).toBe(false)
    expect(next.smallBlind).toBe(40)
    expect(next.bigBlind).toBe(80)
    expect(next.handsAtCurrentLevel).toBe(2)
  })

  it('uses the next rung when the level changes', () => {
    const { next, leveledUp } = advanceBlindLevel({ ...raised(), handsAtCurrentLevel: 2 })
    expect(leveledUp).toBe(true)
    expect(next.smallBlind).toBe(15)
    expect(next.bigBlind).toBe(30)
    expect(next.blindLevelIndex).toBe(1)
  })
})

describe('a finished hand', () => {
  it('leaves the blinds where they are', () => {
    const before = getVenueBlindSettings('PACE')
    expect(recordVenueHandCompleted('PACE')).toBeNull()
    const after = getVenueBlindSettings('PACE')
    expect(after.smallBlind).toBe(before.smallBlind)
    expect(after.bigBlind).toBe(before.bigBlind)
    expect(after.blindLevelIndex).toBe(before.blindLevelIndex)
    expect(after.handsAtCurrentLevel).toBe(before.handsAtCurrentLevel)
  })
})

describe('blinds during a hand', () => {
  const raised = { smallBlind: 50, bigBlind: 100 }

  it('keeps the blinds a hand already started with', () => {
    const betting = { phase: 'betting', smallBlind: 10, bigBlind: 20 }
    const setup = { phase: 'question', smallBlind: 10, bigBlind: 20 }
    expect(applyStoredBlinds(betting, raised)).toBe(betting)
    expect(applyStoredBlinds(setup, raised)).toBe(setup)
  })

  it('applies a blind change once the table is between hands', () => {
    expect(applyStoredBlinds({ phase: 'lobby', smallBlind: 10, bigBlind: 20 }, raised)).toEqual({
      phase: 'lobby',
      smallBlind: 50,
      bigBlind: 100,
    })
  })

  it('shows the hand blinds until the next hand', () => {
    const table = publishedTableBlinds(
      { phase: 'betting', smallBlind: 10, bigBlind: 20 },
      { ...raised, isTableOverride: true },
    )
    expect(table).toEqual({ smallBlind: 10, bigBlind: 20, blindsTableOverride: false })
    expect(
      blindsShownForVenue(
        [{ phase: 'reveal', smallBlind: 10, bigBlind: 20 }],
        raised,
      ),
    ).toEqual({ smallBlind: 10, bigBlind: 20 })
  })

  it('announces the new blinds when the next question starts, not when winners are paid', () => {
    clearVenueBlindNotice('WAIT')
    const during = blindsShownForVenue(
      [{ phase: 'betting', smallBlind: 10, bigBlind: 20 }],
      raised,
    )
    expect(noteShownVenueBlinds('WAIT', during.smallBlind, during.bigBlind, 1_000, true)).toBeNull()
    const waiting = blindsShownForVenue(
      [{ phase: 'lobby', smallBlind: 10, bigBlind: 20 }],
      raised,
    )
    expect(waiting).toEqual({ smallBlind: 50, bigBlind: 100 })
    expect(noteShownVenueBlinds('WAIT', waiting.smallBlind, waiting.bigBlind, 2_000, false)).toBeNull()
    const nextQuestion = blindsShownForVenue(
      [{ phase: 'question', smallBlind: 50, bigBlind: 100 }],
      raised,
    )
    expect(noteShownVenueBlinds('WAIT', nextQuestion.smallBlind, nextQuestion.bigBlind, 3_000, true)).toEqual({
      smallBlind: 50,
      bigBlind: 100,
      atMs: 3_000,
    })
    expect(noteShownVenueBlinds('WAIT', nextQuestion.smallBlind, nextQuestion.bigBlind, 4_000, true)?.atMs).toBe(3_000)
    expect(noteShownVenueBlinds('WAIT', nextQuestion.smallBlind, nextQuestion.bigBlind, 3_000 + 12_000, true)).toBeNull()
  })

  it('shows the saved blinds when every table is waiting', () => {
    expect(
      publishedTableBlinds(
        { phase: 'lobby', smallBlind: 10, bigBlind: 20 },
        { ...raised, isTableOverride: false },
      ),
    ).toEqual({ smallBlind: 50, bigBlind: 100, blindsTableOverride: false })
    expect(blindsShownForVenue([{ phase: 'lobby', smallBlind: 10, bigBlind: 20 }], raised)).toEqual(raised)
  })
})
