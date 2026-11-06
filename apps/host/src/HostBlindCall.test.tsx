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
  it('reads a 120 minute night and leaves the guessing guide alone', () => {
    const html = renderToStaticMarkup(
      <HostBlindCall
        showStartedAtMs={null}
        handsLeft={15}
        players={40}
        medianStack={1000}
        bigBlind={20}
        onApply={() => {}}
      />,
    )
    expect(html).toContain('120 min')
    expect(html).not.toContain('aria-label="Night length"')
    expect(html).toContain('Now')
    expect(html).toContain('Next level')
    expect(html).toContain('Closest increase')
    expect(html).not.toContain('Next level, closest')
    expect(html).not.toContain('Slow down')
    expect(html).not.toContain('guessing guide')
    expect(html.replace(/aria-label="[^"]*"/g, '')).not.toContain('$')
    expect(html).toContain('chip-mark')
    expect(html).not.toContain('level every')
    expect(html).toContain('40 players')
    expect(html).toContain('Apply')
    expect(html).toContain('host-blind-call')
    expect(html).toContain('text-base font-semibold text-amber-50')
    expect(html).toContain('text-base font-semibold text-white')
    expect(html).not.toContain('text-xs')
    expect(html).not.toContain('border-amber-400/30')
    expect(html).not.toContain('>Blind call<')
  })

  it('tunes blinds and the guessing guide from the pace line', () => {
    const html = renderToStaticMarkup(
      <HostBlindCall
        showStartedAtMs={null}
        handsLeft={15}
        players={40}
        medianStack={1000}
        smallBlind={10}
        bigBlind={20}
        onApply={() => {}}
        onSmallBlind={() => {}}
        onBigBlind={() => {}}
        onShuffleEvery={() => {}}
        shuffleEvery={5}
        onSave={() => {}}
      />,
    )
    expect(html).toContain('Small blind')
    expect(html).toContain('Big blind')
    expect(html).not.toContain('Level every')
    expect(html).not.toContain('Re-seat every')
    expect(html).not.toContain('Shuffle every')
    expect(html).not.toContain('aria-label="Guide"')
    expect(html).not.toContain('aria-label="Night length"')
    expect(html).toContain('>Save<')
    expect(html.indexOf('Small blind')).toBeLessThan(html.indexOf('Now'))
  })

  it('waits for seated stacks instead of asking for them', () => {
    const html = renderToStaticMarkup(
      <HostBlindCall
        showStartedAtMs={null}
        handsLeft={25}
        players={0}
        medianStack={null}
        bigBlind={20}
        onApply={() => {}}
      />,
    )
    expect(html).toContain('Fills in from the seated field')
    expect(html).not.toContain('Apply')
  })
})
