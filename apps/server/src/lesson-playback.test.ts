import { describe, expect, it } from 'vitest'
import {
  lessonBeatMs,
  lessonStepAfter,
  normalizeDisplayLayoutPayload,
} from '@qhe/net'

describe('lesson playback on the public layout', () => {
  it('keeps the beat with a lesson and drops it from the table floor', () => {
    expect(
      normalizeDisplayLayoutPayload({
        layout: 'venueWall',
        focusTable: null,
        wallView: 'event',
        lessonStep: 3,
        lessonPaused: true,
      }),
    ).toEqual({
      layout: 'venueWall',
      focusTable: null,
      wallView: 'event',
      lessonStep: 3,
      lessonPaused: true,
    })
    expect(
      normalizeDisplayLayoutPayload({
        layout: 'venueWall',
        focusTable: null,
        wallView: 'floor',
        lessonStep: 3,
        lessonPaused: true,
      }),
    ).toEqual({ layout: 'venueWall', focusTable: null, wallView: 'floor' })
  })

  it('loops the beat and uses the lesson timing', () => {
    expect(lessonStepAfter('event', 6, 1)).toBe(0)
    expect(lessonStepAfter('event', 0, -1)).toBe(6)
    expect(lessonBeatMs('rules', 0)).toBe(6000)
    expect(lessonBeatMs('event', 0)).toBe(9000)
  })
})
