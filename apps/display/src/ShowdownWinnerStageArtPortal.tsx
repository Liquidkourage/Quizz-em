import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import winnerStageCardArt from './assets/winner-stage-card.png'

/** Display bitmap — Lanczos downscale from master; ~5× mosaic tile at 2× DPR. */
export const WINNER_STAGE_CARD_WIDTH = 2400
export const WINNER_STAGE_CARD_HEIGHT = 1439

/** Art aspect — tiles narrower than this use width-first fit (see index.css @container). */
export const WINNER_STAGE_CARD_ASPECT = WINNER_STAGE_CARD_WIDTH / WINNER_STAGE_CARD_HEIGHT

/** Virtual art frame — 120% of tile clip on landscape tiles; 100% on tall/narrow cells. */
export const WINNER_STAGE_ART_SCALE = 1.2

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
        backgroundColor: '#000',
        pointerEvents: 'none',
        zIndex: 9,
        ['--vfd-stage-art-scale' as string]: String(WINNER_STAGE_ART_SCALE),
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
