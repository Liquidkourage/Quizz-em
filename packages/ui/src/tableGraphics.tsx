import type { CSSProperties, ImgHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import pokerTableImg from './assets/poker-table.png'
import cupholderImg from './assets/cupholder.png'
import cardBackImg from './assets/card-back.png'

/** Card-back image URL for consumers that need a raw src. */
export const CARD_BACK_IMAGE_SRC = cardBackImg

/** Stadium poker table (rail + felt) — top-down asset. */
export function PokerTableGraphic({
  className,
  style,
  alt = '',
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & { alt?: string }) {
  return (
    <img
      src={pokerTableImg}
      alt={alt}
      draggable={false}
      className={clsx('pointer-events-none h-full w-full select-none object-contain', className)}
      style={style}
      {...props}
    />
  )
}

/** Recessed cupholder / seat position marker on the rail. */
export function CupholderGraphic({
  className,
  style,
  alt = '',
  dimmed = false,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  alt?: string
  dimmed?: boolean
}) {
  return (
    <img
      src={cupholderImg}
      alt={alt}
      draggable={false}
      className={clsx(
        'pointer-events-none h-full w-full select-none object-contain',
        dimmed && 'opacity-45 saturate-[0.65]',
        className
      )}
      style={style}
      {...props}
    />
  )
}

/** Official playing-card back face. */
export function CardBackGraphic({
  className,
  style,
  alt = '',
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & { alt?: string }) {
  return (
    <img
      src={cardBackImg}
      alt={alt}
      draggable={false}
      className={clsx('pointer-events-none h-full w-full select-none object-cover', className)}
      style={style}
      {...props}
    />
  )
}

export function cardBackShellStyle(width: string, height: string): CSSProperties {
  return {
    width,
    height,
    margin: '10px',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
  }
}
