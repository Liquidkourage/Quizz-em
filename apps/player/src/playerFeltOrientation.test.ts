import { readFileSync } from 'node:fs'
import {
  mosaicFeltCenterPct,
  mosaicSeatHoleLayout,
  mosaicSeatLabelPct,
  mosaicSeatPlayerHoleInwardFrac,
  stadiumPlayerCupholderSizePx,
  stadiumPlayerSeatHoleCardScale,
} from '@qhe/ui'
import { describe, expect, it } from 'vitest'

const REM = 16
const NAME_TAG_PX = 3.35 * REM
const BOTTOM_TAG_PX = 1.5 * REM
const HOLE_CARD_PX = 64
const WIDE_COLUMN_PX = 40 * REM

/** How far a side name extends past the felt, the way the phone tag is translated. */
function sideNameOverflowPx(seatIndex: number, sidePadPx: number): number {
  const feltW = WIDE_COLUMN_PX - sidePadPx * 2
  const feltH = (feltW * 5) / 8
  const outward = Math.max(20, Math.round(stadiumPlayerCupholderSizePx(feltW) * 0.95))
  const label = mosaicSeatLabelPct(seatIndex, feltW, feltH, outward)
  const center = mosaicFeltCenterPct(feltW, feltH)
  const dx = label.leftPct - center.leftPct
  const dy = label.topPct - center.topPct
  const anchorX = (label.leftPct / 100) * feltW
  if (Math.abs(dy) > Math.abs(dx) * 1.05) {
    return Math.max(NAME_TAG_PX / 2 - anchorX, anchorX + NAME_TAG_PX / 2 - feltW, 0)
  }
  return dx > 0 ? anchorX + NAME_TAG_PX - feltW : NAME_TAG_PX - anchorX
}

/** How far the bottom seat's name and hole cards hang past the felt box. */
function bottomSeatOverflowPx(feltW: number): number {
  const feltH = (feltW * 5) / 8
  const outward = Math.max(20, Math.round(stadiumPlayerCupholderSizePx(feltW) * 0.95))
  let past = 0
  for (let seat = 0; seat < 8; seat++) {
    const label = mosaicSeatLabelPct(seat, feltW, feltH, outward)
    const anchorY = (label.topPct / 100) * feltH
    past = Math.max(past, anchorY + BOTTOM_TAG_PX - feltH)
    const hole = mosaicSeatHoleLayout(seat, 8, feltW, feltH, mosaicSeatPlayerHoleInwardFrac(seat))
    const cardH = HOLE_CARD_PX * stadiumPlayerSeatHoleCardScale(feltW, 8, true) * (7 / 5)
    const cardBottom = (hole.topPct / 100) * feltH + cardH / 2
    past = Math.max(past, cardBottom - feltH)
  }
  return past
}

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

function mediaBlock(source: string, header: string): string {
  const start = source.indexOf(header)
  if (start < 0) return ''
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return ''
}

describe('player table orientation', () => {
  it('keeps the landscape felt as drawn', () => {
    const felt = css.slice(css.indexOf('.player-game-felt--fill {'), css.indexOf('.player-game-felt--fill {') + 320)
    expect(felt).toContain('aspect-ratio: 8 / 5')
    expect(felt).not.toContain('rotate')
  })

  it('leaves room under the status line so a top seat name does not cover it', () => {
    const landscape = mediaBlock(
      css.slice(css.lastIndexOf('@media (min-width: 768px) and (orientation: landscape)')),
      '@media (min-width: 768px) and (orientation: landscape)',
    )
    expect(landscape).toContain('.player-game-layout--live-fit .player-game-table-status')
    expect(landscape).toContain('margin-bottom: 4.25rem')
  })

  it('keeps side seat names inside the column on a wide window', () => {
    const landscape = mediaBlock(
      css.slice(css.lastIndexOf('@media (min-width: 768px) and (orientation: landscape)')),
      '@media (min-width: 768px) and (orientation: landscape)',
    )
    expect(landscape).toContain('padding: 2rem 6rem 1.75rem')
    const sideSeats = [1, 2, 3, 5, 6, 7]
    const fitted = Math.max(...sideSeats.map((seat) => sideNameOverflowPx(seat, 6 * REM)))
    const clipped = Math.max(...sideSeats.map((seat) => sideNameOverflowPx(seat, 1.75 * REM)))
    expect(fitted).toBeLessThanOrEqual(6 * REM)
    expect(clipped).toBeGreaterThan(1.75 * REM)
  })

  it('turns the question, cards, and buttons with the table when a touch screen is tall', () => {
    const portrait = mediaBlock(css, '@media (orientation: portrait)')
    expect(portrait.startsWith('@media (orientation: portrait) and (pointer: coarse)')).toBe(true)
    expect(portrait).toContain('.player-game-layout--live-fit')
    expect(portrait).toContain('transform: rotate(90deg)')
    expect(portrait).toContain('width: 100cqh')
    expect(portrait).toContain('height: 100cqw')
    expect(portrait).not.toContain('.player-game-felt--fill')
    expect(portrait).not.toContain('player-felt-card-face')
    expect(portrait).not.toContain('rotate(-90deg)')
  })

  it('sizes the felt under the status line so the desktop wager panel stays below the table', () => {
    const slot = css.slice(
      css.indexOf('.player-game-layout--live-fit .player-game-felt-panel--fill > .player-felt-rotate-slot {'),
    )
    const slotRule = slot.slice(0, slot.indexOf('}') + 1)
    expect(slotRule).toContain('flex: 1 1 0')
    expect(slotRule).toContain('min-height: 0')
    expect(slotRule).toContain('container-type: size')

    const wide = mediaBlock(css.slice(css.lastIndexOf('@media (min-width: 1024px)')), '@media (min-width: 1024px)')
    expect(wide).toContain(
      '.player-game-layout--live-fit.player-game-layout--with-dock .player-game-felt-panel--fill',
    )
    const padding = wide.match(/padding-bottom:\s*([0-9.]+)rem/)
    expect(padding).not.toBeNull()
    const feltW = WIDE_COLUMN_PX - 6 * REM * 2
    expect(Number(padding?.[1]) * REM).toBeGreaterThanOrEqual(bottomSeatOverflowPx(feltW))
  })
})
