import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import winnerStageArt from './assets/winner-stage.png'

/** Native pixels — keep in sync with `assets/winner-stage.png`. */
export const WINNER_STAGE_WIDTH = 3238
export const WINNER_STAGE_HEIGHT = 1942

export const SHOWDOWN_ART_PORTAL_ROOT_ID = 'vfd-showdown-art-portal-root'

type ArtPortalClip = {
  clipLeft: number
  clipTop: number
  clipWidth: number
  clipHeight: number
  imgLeft: number
  imgTop: number
  imgWidth: number
  imgHeight: number
  borderRadius: string
}

function measureArtPortalClip(artBox: HTMLElement, artInner: HTMLElement): ArtPortalClip {
  const box = artBox.getBoundingClientRect()
  const inner = artInner.getBoundingClientRect()
  const article = artBox.closest('article')
  const borderRadius = article ? getComputedStyle(article).borderRadius : '0px'

  return {
    clipLeft: box.left,
    clipTop: box.top,
    clipWidth: box.width,
    clipHeight: box.height,
    imgLeft: inner.left - box.left,
    imgTop: inner.top - box.top,
    imgWidth: inner.width,
    imgHeight: inner.height,
    borderRadius,
  }
}

function resolvePortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(SHOWDOWN_ART_PORTAL_ROOT_ID) ?? document.body
}

function PortaledWinnerStageArt({ clip }: { clip: ArtPortalClip }) {
  const [portalRoot] = useState(resolvePortalRoot)
  if (portalRoot == null) return null

  return createPortal(
    <div
      className="vfd-showdown-stage-art-portal-clip"
      style={{
        position: 'fixed',
        left: clip.clipLeft,
        top: clip.clipTop,
        width: clip.clipWidth,
        height: clip.clipHeight,
        overflow: 'hidden',
        borderRadius: clip.borderRadius,
        pointerEvents: 'none',
        zIndex: 9,
      }}
    >
      <img
        src={winnerStageArt}
        alt=""
        aria-hidden
        draggable={false}
        className="vfd-showdown-stage-art vfd-showdown-stage-art--portaled"
        width={WINNER_STAGE_WIDTH}
        height={WINNER_STAGE_HEIGHT}
        style={{
          position: 'absolute',
          left: clip.imgLeft,
          top: clip.imgTop,
          width: clip.imgWidth,
          height: clip.imgHeight,
          objectFit: 'cover',
          objectPosition: 'center center',
        }}
      />
    </div>,
    portalRoot,
  )
}

/**
 * Renders winner-stage art outside the venue wall `zoom: 0.88` frame so the bitmap
 * is downscaled once at viewport px instead of resampled again at composite.
 */
export function ShowdownWinnerStageArtPortal({ artBox }: { artBox: HTMLDivElement | null }) {
  const [clip, setClip] = useState<ArtPortalClip | null>(null)

  useLayoutEffect(() => {
    if (!artBox) {
      setClip(null)
      return
    }

    const artInner = artBox.querySelector('.vfd-showdown-stage-art-inner')
    if (!(artInner instanceof HTMLElement)) {
      setClip(null)
      return
    }

    const update = () => {
      setClip(measureArtPortalClip(artBox, artInner))
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(artBox)
    ro.observe(artInner)

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

  return <PortaledWinnerStageArt clip={clip} />
}
