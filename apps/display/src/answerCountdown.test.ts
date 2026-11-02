import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { answerSecondsRemaining } from './answerCountdown'
import { useAnswerSecondsLeft } from './useAnswerSecondsLeft'

function ClockProbe({ deadlineMs }: { deadlineMs: number | null }) {
  const seconds = useAnswerSecondsLeft(deadlineMs, 250)
  return createElement('span', null, seconds == null ? 'none' : String(seconds))
}

describe('answer countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rounds up to the next whole second and stops at zero', () => {
    expect(answerSecondsRemaining(10_000, 7_600)).toBe(3)
    expect(answerSecondsRemaining(10_000, 9_001)).toBe(1)
    expect(answerSecondsRemaining(10_000, 10_000)).toBe(0)
    expect(answerSecondsRemaining(10_000, 12_000)).toBe(0)
  })

  it('paints the current second on the clock itself', () => {
    const html = renderToStaticMarkup(createElement(ClockProbe, { deadlineMs: 1_005_500 }))
    expect(html).toContain('>6<')
    const idle = renderToStaticMarkup(createElement(ClockProbe, { deadlineMs: null }))
    expect(idle).toContain('>none<')
  })
})
