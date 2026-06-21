import type { CSSProperties, SVGAttributes } from 'react'
import { clsx } from 'clsx'
import { CardFaceSvg } from './CardFaceSvg'
import { CardBackGraphic } from './tableGraphics'
import { CARD_FACE_ASPECT } from './cardFaceAssets'

export type CardFaceGraphicProps = {
  digit: number
  /** Render the shared card-back asset instead of a digit face. */
  faceDown?: boolean
  /** Muted styling for inactive / folded picks in showdown rows. */
  dimmed?: boolean
  className?: string
  style?: CSSProperties
  alt?: string
} & Omit<SVGAttributes<SVGSVGElement>, 'children'>

/** Official digit card front (0–9 SVG) or card back when `faceDown`. */
export function CardFaceGraphic({
  digit,
  faceDown = false,
  dimmed = false,
  className,
  style,
  alt,
  ...props
}: CardFaceGraphicProps) {
  if (faceDown) {
    return (
      <span
        className={clsx('relative inline-block overflow-hidden', dimmed && 'opacity-45 saturate-[0.65]', className)}
        style={style}
        aria-hidden={alt == null || alt.length === 0 ? true : undefined}
        aria-label={alt}
      >
        <CardBackGraphic className="block h-full w-full object-cover" />
      </span>
    )
  }

  const resolvedAlt = alt ?? `Playing card ${digit}`
  const decorative = alt === ''

  return (
    <CardFaceSvg
      digit={digit}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : resolvedAlt}
      className={clsx(
        'pointer-events-none block h-full w-full select-none',
        dimmed && 'opacity-40 saturate-[0.55]',
        className
      )}
      style={style}
      {...props}
    />
  )
}

/** Width and height for a card face at a given width (5:7 aspect). */
export function cardFaceSizeFromWidth(widthPx: number): { width: number; height: number } {
  const width = Math.max(1, widthPx)
  return { width, height: Math.round(width / CARD_FACE_ASPECT) }
}

export function cardFaceInlineSizeStyle(widthPx: number): CSSProperties {
  const { width, height } = cardFaceSizeFromWidth(widthPx)
  return { width, height }
}
