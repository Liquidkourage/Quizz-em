import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SeatCupholderMarker } from '../../../packages/ui/src/tableGraphics'

function actingInitialCss(): string {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  const start = css.indexOf('@keyframes vfd-acting-initial-pulse')
  if (start < 0) return ''
  return css.slice(start, start + 900)
}

describe('public table initials', () => {
  it('pulses only the initials of the player who is up to act', () => {
    const acting = renderToStaticMarkup(
      createElement(SeatCupholderMarker, {
        state: 'acting',
        label: 'AL',
        labelClassName: 'vfd-mosaic-seat-initial',
      }),
    )
    const waiting = renderToStaticMarkup(
      createElement(SeatCupholderMarker, {
        state: 'default',
        label: 'BK',
        labelClassName: 'vfd-mosaic-seat-initial',
      }),
    )
    const phone = renderToStaticMarkup(
      createElement(SeatCupholderMarker, {
        state: 'acting',
        label: 'You',
        labelClassName: 'font-mono text-sm',
      }),
    )
    expect(acting).toMatch(/vfd-mosaic-seat-initial--acting[^>]*>AL</)
    expect(waiting).not.toContain('vfd-mosaic-seat-initial--acting')
    expect(phone).not.toContain('vfd-mosaic-seat-initial--acting')
    const css = actingInitialCss()
    expect(css).toContain('opacity: 0.86')
    expect(css).toContain('animation: vfd-acting-initial-pulse 2.6s ease-in-out infinite')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('animation: none')
  })
})
