import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import winnerStageArt from './assets/winner-stage.png'

/** Native pixels — keep in sync with `assets/winner-stage.png`. */
export const WINNER_STAGE_WIDTH = 3238
export const WINNER_STAGE_HEIGHT = 1942

export const SHOWDOWN_ART_PORTAL_ROOT_ID = 'vfd-showdown-art-portal-root'

type ArtClip = {
  left: number
  top: number
  width: number
  height: number
  borderRadius: string
}

function measureArtClip(artBox: HTMLElement): ArtClip {
  const box = artBox.getBoundingClientRect()
  const article = artBox.closest('article')
  return {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
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
        pointerEvents: 'none',
        zIndex: 9,
      }}
    >
      <img
        src={winnerStageArt}
        alt=""
        aria-hidden
        draggable={false}
        className="vfd-showdown-stage-art"
        width={WINNER_STAGE_WIDTH}
        height={WINNER_STAGE_HEIGHT}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
        }}
      />
    </div>,
    portalRoot,
  )
}

/**
 * One viewport-pixel downscale of winner-stage — rendered outside the venue wall
 * zoom frame so the bitmap is not resampled again at composite.
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
