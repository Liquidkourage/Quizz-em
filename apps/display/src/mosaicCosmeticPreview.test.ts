import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VenueAerialFloorGrid } from './VenueEightTablesPreview'
import { resolveVenueFloorSpec } from './venueFloorSpec'
import { mosaicCosmeticWall, mosaicPreviewCountFromSearch } from './mosaicCosmeticPreview'

describe('mosaic cosmetic preview', () => {
  it('fills a chosen count with mixed hands and leaves the live game out of it', () => {
    const wall = mosaicCosmeticWall(6)
    expect(wall.tiles).toHaveLength(6)
    expect(wall.showAudienceWelcome).toBe(false)
    expect(wall.tiles.map((tile) => tile.tableNum)).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(wall.tiles.map((tile) => tile.phase)).size).toBeGreaterThan(1)
    expect(wall.tiles.some((tile) => tile.phase === 'answering')).toBe(true)
    expect(wall.tiles.map((tile) => tile.communityDigits)).toEqual([
      [0, 1, 3, 5, 9],
      [0, 1, 3, 5, 9],
      [0, 1, 3, 5, 9],
      [0, 1, 3, 5, 9],
      [0, 1, 3, 5, 9],
      [0, 1, 3, 5, 9],
    ])
    expect(wall.tiles.some((tile) => tile.phase === 'betting' && tile.isBettingOpen === false)).toBe(true)

    const spec = resolveVenueFloorSpec({ populatedTableCount: wall.tiles.length })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: wall.tiles,
        floorSpec: spec!,
        showHeadline: true,
        skipMountIntro: true,
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('Side pot 1')
    expect(html).toContain('Side pot 2')
    expect(html).toContain('to call')
    expect(html).toContain('No more bets')
  })

  it('clamps the mosaic to the numbered tables', () => {
    expect(mosaicCosmeticWall(0).tiles).toHaveLength(1)
    expect(mosaicCosmeticWall(99).tiles).toHaveLength(20)
  })

  it('reads a mosaic count only from a numbered preview query', () => {
    expect(mosaicPreviewCountFromSearch('')).toBeNull()
    expect(mosaicPreviewCountFromSearch('?room=PREVIEW')).toBeNull()
    expect(mosaicPreviewCountFromSearch('?room=PREVIEW&mosaic=9')).toBe(9)
    expect(mosaicPreviewCountFromSearch('?mosaic=1')).toBe(1)
    expect(mosaicPreviewCountFromSearch('?mosaic=20')).toBe(20)
    expect(mosaicPreviewCountFromSearch('?mosaic=0')).toBeNull()
    expect(mosaicPreviewCountFromSearch('?mosaic=21')).toBeNull()
    expect(mosaicPreviewCountFromSearch('?mosaic=abc')).toBeNull()
  })
})
