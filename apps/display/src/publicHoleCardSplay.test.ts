import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { soloBroadcastHoleCardSplay } from './venueMosaicSeatGeometry'

describe('public hole card splay', () => {
  it('uses that splay on the one-table public felt', () => {
    const source = readFileSync(new URL('./VenueEightTablesPreview.tsx', import.meta.url), 'utf8')
    const pair = source.slice(source.indexOf('<FeltHoleCardPair'), source.indexOf('<FeltHoleCardPair') + 420)
    expect(pair).toContain('fanDeg={soloHoleSplay.fanDeg}')
    expect(pair).toContain('overlapPx={soloHoleSplay.overlapPx}')
  })

  it('overlaps a large one-table pair by about a third of the card, not flat together', () => {
    const splay = soloBroadcastHoleCardSplay(1.2)
    const visualW = 64 * 1.2
    const centerDistance = 64 + splay.overlapPx
    expect(splay.fanDeg).toBe(8)
    expect(visualW - centerDistance).toBeCloseTo(visualW * 0.36, 0)
    expect(splay.overlapPx).toBeGreaterThan(-30 * (1.2 / 0.58))
  })
})
