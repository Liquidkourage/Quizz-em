import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { mosaicSeatHoleLayout } from './mosaicSeatGeometry'
import { PlayerFeltHoleCards } from './playerFeltHoleCards'

describe('player felt card faces', () => {
  it('keeps seat 5 readable with 12 o’clock at the top', () => {
    const bottom = mosaicSeatHoleLayout(4, 8, 800, 500)
    expect(Math.abs(bottom.rotateDeg)).toBeGreaterThan(90)

    const html = renderToStaticMarkup(
      createElement(PlayerFeltHoleCards, {
        scale: 0.4,
        rotateDeg: bottom.rotateDeg,
        digits: [1, 2],
        faceDown: false,
      }),
    )

    expect(html).toContain('player-felt-card-face')
    expect(html).not.toContain('rotate(')
  })

  it('aims a face-down pair along that seat’s line to the center', () => {
    const side = mosaicSeatHoleLayout(2, 8, 800, 500)
    expect(Math.abs(side.rotateDeg)).toBeGreaterThan(45)

    const html = renderToStaticMarkup(
      createElement(PlayerFeltHoleCards, {
        scale: 0.4,
        rotateDeg: side.rotateDeg,
        faceDown: true,
      }),
    )

    expect(html).toContain(`rotate(${side.rotateDeg}deg)`)
    expect(html).not.toContain('player-felt-card-face')
  })
})
