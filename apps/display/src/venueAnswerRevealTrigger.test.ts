import { describe, expect, it } from 'vitest'
import { resolveVenueAnswerRevealTrigger } from './venueAnswerRevealTrigger'

describe('resolveVenueAnswerRevealTrigger', () => {
  it('fires on answering deadline clear', () => {
    expect(
      resolveVenueAnswerRevealTrigger({
        prevAnswerDeadlineMs: 1000,
        nextAnswerDeadlineMs: null,
        revealedDeadlineMs: null,
        prevInShowdown: false,
        nextInShowdown: true,
        revealedShowdownKey: null,
        showdownKey: '1924|q',
      }),
    ).toBe('deadline')
  })

  it('does not re-fire the same deadline', () => {
    expect(
      resolveVenueAnswerRevealTrigger({
        prevAnswerDeadlineMs: 1000,
        nextAnswerDeadlineMs: null,
        revealedDeadlineMs: 1000,
        prevInShowdown: false,
        nextInShowdown: true,
        revealedShowdownKey: null,
        showdownKey: '1924|q',
      }),
    ).toBe('showdown')
  })

  it('fires on first showdown entry when deadline edge was missed', () => {
    expect(
      resolveVenueAnswerRevealTrigger({
        prevAnswerDeadlineMs: null,
        nextAnswerDeadlineMs: null,
        revealedDeadlineMs: null,
        prevInShowdown: false,
        nextInShowdown: true,
        revealedShowdownKey: null,
        showdownKey: '1924|q',
      }),
    ).toBe('showdown')
  })

  it('does not re-fire the same showdown key', () => {
    expect(
      resolveVenueAnswerRevealTrigger({
        prevAnswerDeadlineMs: null,
        nextAnswerDeadlineMs: null,
        revealedDeadlineMs: null,
        prevInShowdown: false,
        nextInShowdown: true,
        revealedShowdownKey: '1924|q',
        showdownKey: '1924|q',
      }),
    ).toBe(null)
  })
})
