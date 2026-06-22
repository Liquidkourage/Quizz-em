import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import winnerStageCardArt from './assets/winner-stage-card.png'
import winnerStageCardPortraitArt from './assets/winner-stage-card-portrait.png'
import {
  showdownStageArtLayoutForBox,
  winnerStageArtScale,
  WINNER_STAGE_ART_SCALE_LANDSCAPE,
  type ShowdownStageArtLayout,
} from './showdownStageArtLayout'

/** Display bitmap — Lanczos downscale from master; ~5× mosaic tile at 2× DPR. */
export const WINNER_STAGE_CARD_WIDTH = 2400
export const WINNER_STAGE_CARD_HEIGHT = 1439

/** Portrait master — tighter vertical composition for tall mosaic tiles. */
export const WINNER_STAGE_CARD_PORTRAIT_WIDTH = 1200
export const WINNER_STAGE_CARD_PORTRAIT_HEIGHT = 1680

/** @deprecated Use {@link WINNER_STAGE_ART_SCALE_LANDSCAPE}. */
export const WINNER_STAGE_ART_SCALE = WINNER_STAGE_ART_SCALE_LANDSCAPE

export const SHOWDOWN_ART_PORTAL_ROOT_ID = 'vfd-showdown-art-portal-root'

type ArtClip = {
  left: number
  top: number
  width: number
  height: number
  borderRadius: string
}

function snapViewportPx(value: number, dpr: number): number {
  return Math.round(value * dpr) / dpr
}

function measureArtClip(artBox: HTMLElement): ArtClip {
  const box = artBox.getBoundingClientRect()
  const article = artBox.closest('article')
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return {
    left: snapViewportPx(box.left, dpr),
    top: snapViewportPx(box.top, dpr),
    width: snapViewportPx(box.width, dpr),
    height: snapViewportPx(box.height, dpr),
    borderRadius: article ? getComputedStyle(article).borderRadius : '0px',
  }
}

function resolvePortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(SHOWDOWN_ART_PORTAL_ROOT_ID) ?? document.body
}

function artScaleForLayout(layout: ShowdownStageArtLayout, tableCount: number): number {
  return winnerStageArtScale(layout, tableCount)
}

function PortaledArt({
  clip,
  layout,
  layoutTableCount,
}: {
  clip: ArtClip
  layout: ShowdownStageArtLayout
  layoutTableCount: number
}) {
  const [portalRoot] = useState(resolvePortalRoot)
  if (portalRoot == null) return null

  const portrait = layout === 'portrait'
  const artScale = artScaleForLayout(layout, layoutTableCount)

  return createPortal(
    <div
      className={`vfd-showdown-stage-art-portal${portrait ? ' vfd-showdown-stage-art-portrait' : ''}`}
      data-stage-art-layout={layout}
      style={{
        position: 'fixed',
        left: clip.left,
        top: clip.top,
        width: clip.width,
        height: clip.height,
        overflow: 'hidden',
        borderRadius: clip.borderRadius,
        backgroundColor: '#000',
        pointerEvents: 'none',
        zIndex: 9,
        ['--vfd-stage-art-scale' as string]: String(artScale),
      }}
    >
      <div className="vfd-showdown-stage-zoom-frame">
        <img
          src={portrait ? winnerStageCardPortraitArt : winnerStageCardArt}
          alt=""
          aria-hidden
          draggable={false}
          className={
            portrait
              ? 'vfd-showdown-stage-art vfd-showdown-stage-art--width-fill'
              : 'vfd-showdown-stage-art vfd-showdown-stage-art--height-fill'
          }
          width={portrait ? WINNER_STAGE_CARD_PORTRAIT_WIDTH : WINNER_STAGE_CARD_WIDTH}
          height={portrait ? WINNER_STAGE_CARD_PORTRAIT_HEIGHT : WINNER_STAGE_CARD_HEIGHT}
          decoding="async"
        />
      </div>
    </div>,
    portalRoot,
  )
}

/**
 * Card-sized winner-stage bitmap, portaled outside the venue-wall zoom frame so the
 * browser performs one clean downscale instead of resampling 3K art at composite.
 */
export function ShowdownWinnerStageArtPortal({
  artBox,
  layout: layoutProp,
  layoutTableCount = 14,
}: {
  artBox: HTMLDivElement | null
  layout?: ShowdownStageArtLayout
  layoutTableCount?: number
}) {
  const [clip, setClip] = useState<ArtClip | null>(null)
  const [measuredLayout, setMeasuredLayout] = useState<ShowdownStageArtLayout>('landscape')

  useLayoutEffect(() => {
    if (!artBox) {
      setClip(null)
      return
    }

    const update = () => {
      setClip(measureArtClip(artBox))
      const { width, height } = artBox.getBoundingClientRect()
      setMeasuredLayout(showdownStageArtLayoutForBox(width, height))
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(artBox)

    const article = artBox.closest('article')
    if (article) ro.observe(article)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [artBox])

  if (clip == null) return null

  const layout = layoutProp ?? measuredLayout

  return <PortaledArt clip={clip} layout={layout} layoutTableCount={layoutTableCount} />
}
