/** Shared gold circular seat badge — map markers and roster rows. */
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
  const classes = [
    'seating-seat-badge',
    `seating-seat-badge--${size}`,
    empty ? 'seating-seat-badge--empty' : '',
    highlight ? 'seating-seat-badge--highlight' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} aria-hidden={size === 'map' ? true : undefined}>
      {seatNum}
    </span>
  )
}
