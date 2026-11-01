import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostBlindCall, minutesLeftOnClock } from './HostBlindCall'

describe('minutesLeftOnClock', () => {
  it('counts down from the moment the night left the lobby', () => {
    expect(minutesLeftOnClock(120, 1_000, 1_000 + 10 * 60_000)).toBe(110)
  })

  it('keeps the full night before the first hand', () => {
    expect(minutesLeftOnClock(120, null, 50_000)).toBe(120)
  })
})

describe('HostBlindCall', () => {
  it('reads the field and tells the host to speed the blinds up', () => {
    const html = renderToStaticMarkup(
      <HostBlindCall
        showStartedAtMs={null}
        handsLeft={15}
        players={40}
        startedWith={40}
        medianStack={1000}
        bigBlind={20}
        handsPerLevel={5}
        guideSec={45}
        goalMinutes={60}
        onApply={() => {}}
      />,
    )
    expect(html).toContain('Speed up')
    expect(html).toContain('$15 / $30')
    expect(html).toContain('level every 2 hands')
    expect(html).toContain('40 players')
    expect(html).toContain('Apply')
  })

  it('waits for seated stacks instead of asking for them', () => {
    const html = renderToStaticMarkup(
      <HostBlindCall
        showStartedAtMs={null}
        handsLeft={25}
        players={0}
        startedWith={0}
        medianStack={null}
        bigBlind={20}
        handsPerLevel={3}
        guideSec={45}
        onApply={() => {}}
      />,
    )
    expect(html).toContain('Fills in from the seated field')
    expect(html).not.toContain('Apply')
  })
})
