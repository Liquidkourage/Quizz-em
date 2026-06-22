import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import winnerStageCardArt from './assets/winner-stage-card.png'

/** Display bitmap — Lanczos downscale from master; ~5× mosaic tile at 2× DPR. */
export const WINNER_STAGE_CARD_WIDTH = 2400
export const WINNER_STAGE_CARD_HEIGHT = 1439

const WINNER_STAGE_CARD_ASPECT = WINNER_STAGE_CARD_WIDTH / WINNER_STAGE_CARD_HEIGHT

/** Virtual art frame — up to 120% of tile clip on landscape tiles; shrinks on tall/narrow cells. */
export const WINNER_STAGE_ART_SCALE = 1.2

/** Match stage art letterbox (see .vfd-showdown-stage-art-box). */
export const WINNER_STAGE_LETTERBOX_BG = '#040308'

export const SHOWDOWN_ART_PORTAL_ROOT_ID = 'vfd-showdown-art-portal-root'

/**
 * Height-fill scale that keeps laurel wreaths inside the tile width.
 * Tall/narrow cells letterbox with {@link WINNER_STAGE_LETTERBOX_BG} instead of cropping sides.
 */
export function winnerStageArtScaleForTile(width: number, height: number): number {
  if (width <= 0 || height <= 0) return WINNER_STAGE_ART_SCALE
  const widthFitScale = (width / height) / WINNER_STAGE_CARD_ASPECT
  const insetScale = widthFitScale * 0.96
  if (insetScale >= WINNER_STAGE_ART_SCALE) return WINNER_STAGE_ART_SCALE
  return insetScale
}

function syncStageArtScale(artBox: HTMLElement, scale: number): void {
  const value = String(scale)
  artBox.style.setProperty('--vfd-stage-art-scale', value)
  const stage = artBox.closest('.vfd-showdown-stage')
  if (stage instanceof HTMLElement) {
    stage.style.setProperty('--vfd-stage-art-scale', value)
  }
}

type ArtClip = {
  left: number
  top: number
  width: number
  height: number
  borderRadius: string
  artScale: number
}

function snapViewportPx(value: number, dpr: number): number {
  return Math.round(value * dpr) / dpr
}

function measureArtClip(artBox: HTMLElement): ArtClip {
  const box = artBox.getBoundingClientRect()
  const article = artBox.closest('article')
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const artScale = winnerStageArtScaleForTile(box.width, box.height)
  syncStageArtScale(artBox, artScale)
  return {
    left: snapViewportPx(box.left, dpr),
    top: snapViewportPx(box.top, dpr),
    width: snapViewportPx(box.width, dpr),
    height: snapViewportPx(box.height, dpr),
    borderRadius: article ? getComputedStyle(article).borderRadius : '0px',
    artScale,
  }
}

function resolvePortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(SHOWDOWN_ART_PORTAL_ROOT_ID) ?? document.body
}

function PortaledArt({ clip }: { clip: ArtClip }) {
  const [portalRoot] = useState(resolvePortalRoot)
  if (portalRoot == null) return null

  return createPortal(
    <div
      className="vfd-showdown-stage-art-portal"
      style={{
        position: 'fixed',
        left: clip.left,
        top: clip.top,
        width: clip.width,
        height: clip.height,
        overflow: 'hidden',
        borderRadius: clip.borderRadius,
        backgroundColor: WINNER_STAGE_LETTERBOX_BG,
        pointerEvents: 'none',
        zIndex: 9,
        ['--vfd-stage-art-scale' as string]: String(clip.artScale),
      }}
    >
      <div className="vfd-showdown-stage-zoom-frame">
        <img
          src={winnerStageCardArt}
          alt=""
          aria-hidden
          draggable={false}
          className="vfd-showdown-stage-art vfd-showdown-stage-art--height-fill"
          width={WINNER_STAGE_CARD_WIDTH}
          height={WINNER_STAGE_CARD_HEIGHT}
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
export function ShowdownWinnerStageArtPortal({ artBox }: { artBox: HTMLDivElement | null }) {
  const [clip, setClip] = useState<ArtClip | null>(null)

  useLayoutEffect(() => {
    if (!artBox) {
      setClip(null)
      return
    }

    const update = () => setClip(measureArtClip(artBox))

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

  return <PortaledArt clip={clip} />
}
