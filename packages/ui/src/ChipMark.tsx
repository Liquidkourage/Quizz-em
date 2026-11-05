import { Fragment, type ReactNode } from 'react'
import { CHIP_MARK_PATH, CHIP_MARK_VIEWBOX } from './chipMarkPath'

export type ChipMarkProps = {
  className?: string
}

/**
 * Mirrored question-mark emblem used as the chip currency mark.
 * Inherits color from the surrounding text. Height follows the font size.
 */
export function ChipMark({ className }: ChipMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={CHIP_MARK_VIEWBOX}
      className={className ? `chip-mark ${className}` : 'chip-mark'}
      aria-hidden="true"
      focusable="false"
      style={{
        display: 'inline-block',
        height: 'var(--chip-mark-height, 0.95em)',
        width: 'auto',
        verticalAlign: 'var(--chip-mark-align, -0.12em)',
        overflow: 'visible',
      }}
    >
      <path fill="currentColor" fillRule="evenodd" d={CHIP_MARK_PATH} />
    </svg>
  )
}

/**
 * Renders a string, swapping each `$` for {@link ChipMark}.
 * Screen readers still hear the original text (including “dollar”).
 */
/** One color per side pot, shared by its numeral and its total. */
const SIDE_POT_COLORS = ['#38bdf8', '#c084fc', '#fb7185', '#fbbf24', '#4ade80'] as const

export function sidePotColor(mark: number): string {
  const slot = Math.abs(Math.floor(mark) - 1) % SIDE_POT_COLORS.length
  return SIDE_POT_COLORS[slot] ?? SIDE_POT_COLORS[0]
}

/** Small number matching the side pot a player can win. Seat marks sit tighter on initials. */
export function SidePotMark({ mark, seat = false }: { mark?: number | null; seat?: boolean }): ReactNode {
  if (mark == null || mark <= 0) return null
  return (
    <sup
      className="side-pot-mark"
      style={{ fontSize: seat ? '0.4em' : '0.55em', lineHeight: 1, color: sidePotColor(mark) }}
    >
      {mark}
    </sup>
  )
}

export function ChipText({ text }: { text: string }): ReactNode {
  if (!text.includes('$')) return text
  const parts = text.split('$')
  return (
    <span className="chip-text" style={{ display: 'inline' }} aria-label={text}>
      <span aria-hidden="true">
        {parts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 ? <ChipMark /> : null}
            {part}
          </Fragment>
        ))}
      </span>
    </span>
  )
}
