import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { HostAnswerClock } from './hostDeskLayout'
import { clearServerClockSample, recordServerClockSample } from './serverClock'

function felt(answerDeadlineMs: number): HostVenueFeltBeatRow {
  return {
    tableNum: 1,
    active: true,
    seated: 2,
    phase: 'answering',
    street: 'answer',
    clock: '',
    answerDeadlineMs,
    phaseStrictSig: 'answer',
  }
}

describe('host clock follows the server', () => {
  afterEach(() => {
    clearServerClockSample()
  })

  it('counts the answer clock from server time when the laptop clock is ahead', () => {
    const base = Date.now()
    recordServerClockSample(base + 2_000)
    const html = renderToStaticMarkup(
      createElement(HostAnswerClock, { rows: [felt(base + 10_000)] }),
    )
    expect(html).toContain('8 seconds left')
  })
})
