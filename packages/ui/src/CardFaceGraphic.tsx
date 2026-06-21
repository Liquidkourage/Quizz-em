import type { CSSProperties, ImgHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { CardBackSvg } from './CardBackSvg'
import { CARD_FACE_ASPECT, cardFaceImageSrc } from './cardFaceAssets'

export type CardFaceGraphicProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  digit: number
  /** Render the shared card-back asset instead of a digit face. */
  faceDown?: boolean
  /** Muted styling for inactive / folded picks in showdown rows. */
  dimmed?: boolean
  alt?: string
}

/** Official digit card front (0–9 artwork) or vector card back when `faceDown`. */
export function CardFaceGraphic({
  digit,
  faceDown = false,
  dimmed = false,
  className,
  style,
  alt,
  draggable = false,
  ...props
}: CardFaceGraphicProps) {
  if (faceDown) {
    return (
      <CardBackSvg
        className={clsx(
          'pointer-events-none block select-none',
          dimmed && 'opacity-45 saturate-[0.65]',
          className
        )}
        style={style}
        aria-hidden={alt === '' ? true : undefined}
        aria-label={alt === '' ? undefined : alt}
      />
    )
  }

  const resolvedAlt = alt ?? `Playing card ${digit}`
  const decorative = alt === ''

  return (
    <img
      src={cardFaceImageSrc(digit)}
      alt={decorative ? '' : resolvedAlt}
      draggable={draggable}
      aria-hidden={decorative ? true : undefined}
      className={clsx(
        'pointer-events-none block h-full w-full select-none object-contain',
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
