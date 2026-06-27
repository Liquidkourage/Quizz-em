import { seatingSeatBadgeSrc } from './seatingSeatBadgeAssets'

/** Shared gold seat-badge art — map markers and roster rows. */
export function SeatingSeatBadge({
  seatNum,
  size,
  empty = false,
  highlight = false,
  className = '',
}: {
  seatNum: number
  size: 'map' | 'roster'
  empty?: boolean
  highlight?: boolean
  className?: string
}) {
  const src = seatingSeatBadgeSrc(seatNum)
  const classes = [
    'seating-seat-badge',
    `seating-seat-badge--${size}`,
    empty ? 'seating-seat-badge--empty' : '',
    highlight ? 'seating-seat-badge--highlight' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (src == null) {
    return (
      <span className={classes} aria-hidden={size === 'map' ? true : undefined}>
        {seatNum}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={size === 'map' ? '' : `Seat ${seatNum}`}
      aria-hidden={size === 'map' ? true : undefined}
      className={classes}
      decoding="async"
      draggable={false}
    />
  )
}
