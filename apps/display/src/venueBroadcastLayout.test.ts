import { describe, expect, it } from 'vitest'
import { STADIUM_REFERENCE_TABLE_WIDTH_PX } from '@qhe/ui'
import {
  broadcastFeltScale,
  dualBroadcastHoleCardBoxPx,
  buildVenueBroadcastMetaLine,
  isVenueBroadcastFloor,
  isVenueDualTableBroadcast,
  isVenueSingleTableBroadcast,
  VENUE_BROADCAST_TABLE_MAX,
} from './venueBroadcastLayout'

describe('venueBroadcastLayout', () => {
  it('keeps one table on the mosaic floor', () => {
    expect(VENUE_BROADCAST_TABLE_MAX).toBe(1)
    expect(isVenueBroadcastFloor(1, null)).toBe(false)
    expect(isVenueBroadcastFloor(2, null)).toBe(false)
    expect(isVenueBroadcastFloor(3, null)).toBe(false)
    expect(isVenueBroadcastFloor(2, 1)).toBe(false)
  })

  it('scales a two-table felt with its width instead of the full-table minimum', () => {
    const half = 640
    expect(broadcastFeltScale(half, 'dual')).toBeCloseTo(half / STADIUM_REFERENCE_TABLE_WIDTH_PX, 5)
    expect(broadcastFeltScale(half, 'solo')).toBe(0.78)
    expect(broadcastFeltScale(half, 'dual')).toBeLessThan(broadcastFeltScale(half, 'solo'))
  })

  it('sizes two-table hole cards smaller than that felt’s community board', () => {
    const box = dualBroadcastHoleCardBoxPx(640)
    const communityW = Math.round(76 * broadcastFeltScale(640, 'dual'))
    expect(box.widthPx).toBe(Math.max(28, Math.round(communityW * 0.68)))
    expect(box.widthPx).toBeLessThan(communityW)
    expect(box.heightPx).toBe(Math.round((box.widthPx * 7) / 5))
    expect(box.overlapPx).toBe(Math.max(8, Math.round(box.widthPx * 0.36)))
  })

  it('splits single vs dual broadcast modes', () => {
    expect(isVenueSingleTableBroadcast(1, null)).toBe(false)
    expect(isVenueDualTableBroadcast(1, null)).toBe(false)
    expect(isVenueSingleTableBroadcast(2, null)).toBe(false)
    expect(isVenueDualTableBroadcast(2, null)).toBe(false)
  })

  it('leaves the broadcast strip unused for the one-table mosaic', () => {
    expect(
      buildVenueBroadcastMetaLine([{ tableNum: 1, seated: 7 } as never], {
        survivors: 7,
        peakSurvivors: 20,
        liveTables: 1,
        fillPct: 35,
        handsUntilShuffle: null,
        shuffleEveryHands: 5,
        shuffleFillPct: 0,
      })
    ).toBeNull()
  })

  it('leaves the broadcast strip unused once two tables share the mosaic headline', () => {
    expect(
      buildVenueBroadcastMetaLine(
        [{ tableNum: 1, seated: 4 } as never, { tableNum: 2, seated: 5 } as never],
        {
          survivors: 91,
          peakSurvivors: 110,
          liveTables: 2,
          fillPct: 82,
          handsUntilShuffle: 3,
          shuffleEveryHands: 5,
          shuffleFillPct: 40,
        }
      )
    ).toBeNull()
  })
})
