import { readFileSync } from 'node:fs'
import { mosaicFeltCenterPct, mosaicSeatLabelPct, stadiumPlayerCupholderSizePx } from '@qhe/ui'
import { describe, expect, it } from 'vitest'

const REM = 16
const NAME_TAG_PX = 3.35 * REM
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

  it('turns that same felt 90 degrees when the device is portrait', () => {
    const portrait = mediaBlock(css, '@media (orientation: portrait)')
    expect(portrait).toContain('.player-felt-rotate-slot .player-game-felt--fill')
    expect(portrait).toContain('transform: rotate(90deg)')
    expect(portrait).toContain('width: 100cqh')
    expect(portrait).toContain('height: 100cqw')
  })
})
