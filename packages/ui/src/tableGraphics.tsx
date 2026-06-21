import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import pokerTableImg from './assets/poker-table.png'
import cupholderImg from './assets/cupholder.png'
import cardBackImg from './assets/card-back.png'

/** Card-back image URL for consumers that need a raw src. */
export const CARD_BACK_IMAGE_SRC = cardBackImg

export type SeatCupholderState = 'default' | 'acting' | 'answerLocked' | 'winner' | 'folded' | 'empty'

const seatCupholderStateRing: Record<SeatCupholderState, string> = {
  default: '',
  acting: 'ring-2 ring-amber-400/90 shadow-[0_0_14px_rgba(234,179,8,0.35)]',
  answerLocked: 'ring-2 ring-cyan-400/50 shadow-[0_0_14px_rgba(34,211,238,0.55)]',
  winner: 'ring-2 ring-amber-400/45 shadow-[0_0_14px_rgba(251,191,36,0.5)]',
  folded: 'opacity-75 saturate-[0.55]',
  empty: 'opacity-55 saturate-[0.5]',
}

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
        'pointer-events-none h-full w-full select-none object-cover',
        dimmed && 'opacity-45 saturate-[0.65]',
        className
      )}
      style={style}
      {...props}
    />
  )
}

/**
 * One consistent cupholder render — same graphic, size, and label treatment in every state.
 * State is shown with an outer ring only (acting / answer locked / winner) or dimming (folded / empty).
 */
export function SeatCupholderMarker({
  state = 'default',
  label,
  labelClassName,
  sizePx,
  sizeClassName,
  className,
  style,
  children,
  'aria-label': ariaLabel,
}: {
  state?: SeatCupholderState
  label?: ReactNode
  labelClassName?: string
  /** Fixed square size in px — preferred for mosaic / hero felts. */
  sizePx?: number
  /** Tailwind size classes when px sizing is not used (e.g. spotlight hero). */
  sizeClassName?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
  'aria-label'?: string
}) {
  const dimmed = state === 'folded' || state === 'empty'

  return (
    <div
      className={clsx(
        'relative shrink-0 overflow-hidden rounded-full',
        sizeClassName,
        seatCupholderStateRing[state],
        className
      )}
      style={{
        ...(sizePx != null ? { width: sizePx, height: sizePx } : undefined),
        ...style,
      }}
      aria-label={ariaLabel}
      aria-current={state === 'acting' ? true : undefined}
    >
      <CupholderGraphic dimmed={dimmed} className="absolute inset-0 h-full w-full" />
      {label != null && String(label).length > 0 ? (
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center truncate px-0.5 text-center font-black leading-none tracking-tight text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95),0_0_6px_rgba(0,0,0,0.85)]',
            labelClassName
          )}
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
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
