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

  it('keeps a portrait touch screen upright, question then felt then bets', () => {
    expect(css).not.toContain('rotate(90deg)')
    expect(css).not.toContain('(orientation: portrait) and (pointer: coarse)')
    const layout = css.slice(css.indexOf('.player-game-layout {'), css.indexOf('.player-game-layout {') + 500)
    expect(layout).toContain('flex-direction: column')
  })

  it('keeps a short landscape phone from using the wide-screen gutters', () => {
    const wide = mediaBlock(
      css.slice(css.lastIndexOf('@media (min-width: 768px) and (orientation: landscape)')),
      '@media (min-width: 768px) and (orientation: landscape)',
    )
    expect(wide.startsWith('@media (min-width: 768px) and (orientation: landscape) and (min-height: 521px)')).toBe(
      true,
    )

    const feltPad = 'padding: 0.1rem 2.6rem 2.5rem'
    const short = mediaBlock(css.slice(css.lastIndexOf('@media', css.indexOf(feltPad))), '@media')
    expect(short).toContain('max-height: 520px')
    expect(short).not.toContain('pointer: coarse')
    expect(short).toContain('padding: 0.1rem 2.6rem 2.5rem')
    expect(short).toContain('padding-top: 2.15rem')
    expect(short).toContain('margin: 0 0 1.5rem')
    expect(short).toContain('max-height: 3.4rem')
    expect(short).not.toContain('margin-bottom: 4.25rem')
    expect(short).not.toContain('padding: 2rem 6rem 1.75rem')
    const dockCap = css.indexOf('max-height: min(42%, 16rem)')
    const shortDock = css.lastIndexOf('max-height: 9.5rem')
    expect(dockCap).toBeGreaterThan(0)
    expect(shortDock).toBeGreaterThan(dockCap)

    const foldHeader = '@media (max-height: 320px)'
    const fold = mediaBlock(css.slice(css.indexOf(foldHeader)), foldHeader)
    expect(fold.startsWith(foldHeader)).toBe(true)
    expect(fold).toContain('margin: 0 0 1.15rem')
    expect(fold).toContain('padding: 0 1rem 2.35rem')
    expect(fold).toContain('padding-top: 2.15rem')
    expect(fold).toContain('font-size: 1rem')
    expect(fold).toContain('max-height: none')
    expect(fold).toContain('position: static')
    expect(fold).not.toContain('display: none')
    expect(fold).not.toContain('position: absolute')
    expect(fold).not.toContain('bottom: -')
    expect(css.indexOf(foldHeader)).toBeGreaterThan(shortDock)
    expect(css.lastIndexOf('min-height: 1.7rem')).toBe(-1)
    expect(css.lastIndexOf('min-height: 1.85rem')).toBe(-1)
    expect(css).not.toContain('grid-template-columns: 5.75rem minmax(0, 1fr) 5.75rem')

    const phoneFitHeader = '@media (max-height: 520px)'
    const phoneFitAt = css.lastIndexOf(phoneFitHeader)
    const phoneFit = mediaBlock(css.slice(phoneFitAt), phoneFitHeader)
    expect(phoneFitAt).toBeGreaterThan(css.indexOf('min-height: 2.75rem'))
    expect(phoneFit).not.toContain('min-height: 1.7rem')
    expect(phoneFit).not.toContain('pointer: coarse')
    expect(phoneFit).toContain('padding-bottom: 1.35rem')
  })

  it('keeps a wide landscape table in the open space above the wager panel', () => {
    const felt = css.slice(
      css.indexOf('.player-game-layout--live-fit .player-game-felt--fill {'),
      css.indexOf('.player-game-layout--live-fit .player-game-felt--fill {') + 320,
    )
    expect(felt).toContain('width: min(100%, calc(100cqh * 8 / 5))')
    expect(felt).toContain('height: min(100cqh, calc(100cqw * 5 / 8))')
    expect(felt).toContain('max-height: 100%')

    const wideHeader = '@media (min-width: 1024px) and (orientation: landscape) and (pointer: fine)'
    const wide = mediaBlock(css.slice(css.lastIndexOf(wideHeader)), wideHeader)
    expect(wide).toContain('.player-game-wager-inline')
    expect(wide).toContain('flex: 0 1 auto')
    expect(wide).toContain('min-height: 0')
    expect(wide).toContain('.player-game-wager-scroll')
    expect(wide).toContain('overflow-y: auto')
    expect(wide).toContain('.player-game-wager-inline .player-game-wager-actions')
    expect(wide).toContain('flex: 0 0 auto')
    expect(wide).toContain('max-height: 42%')
    const padding = wide.match(/padding-bottom:\s*([0-9.]+)rem/)
    expect(padding).not.toBeNull()
    const feltW = WIDE_COLUMN_PX - 6 * REM * 2
    expect(Number(padding?.[1]) * REM).toBeGreaterThanOrEqual(bottomSeatOverflowPx(feltW))
  })
})
