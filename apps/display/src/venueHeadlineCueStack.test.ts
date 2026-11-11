import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('public question headline', () => {
  it('stacks the player count under the question number so the question can grow', () => {
    const source = readFileSync(new URL('./VenueEightTablesPreview.tsx', import.meta.url), 'utf8')
    const start = source.indexOf('venue-headline-question-card')
    const card = source.slice(start, source.indexOf('VenueFloorHeadlineAside', start))
    const stack = card.indexOf('venue-headline-cue-stack')
    const cue = card.indexOf('Question {setlistCueNumber} of {setlistCueTotal}')
    const remaining = card.indexOf('<VenueHeadlineCondenseStatsPill')
    const question = card.indexOf('<DisplayFitQuestionText')
    expect(card).toContain('flex-row')
    expect(stack).toBeGreaterThan(-1)
    expect(cue).toBeGreaterThan(stack)
    expect(remaining).toBeGreaterThan(cue)
    expect(question).toBeGreaterThan(remaining)
    expect(card.slice(stack, remaining)).toContain('flex-col')
    expect(card).not.toContain('ml-auto')
  })
})
