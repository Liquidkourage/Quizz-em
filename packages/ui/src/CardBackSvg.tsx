import { useId, type SVGAttributes } from 'react'

const VIEW_W = 500
const VIEW_H = 700
const CARD_RX = 36

/** Vector card back — navy felt + gold frame + star emblem (matches card face frame). */
export function CardBackSvg({
  className,
  style,
  ...props
}: Omit<SVGAttributes<SVGSVGElement>, 'children'>) {
  const uid = useId().replace(/:/g, '')
  const bgId = `back-bg-${uid}`
  const goldId = `back-gold-${uid}`
  const vignetteId = `back-vignette-${uid}`

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      shapeRendering="geometricPrecision"
      aria-hidden
      {...props}
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="44%" r="72%">
          <stop offset="0%" stopColor="#243a5e" />
          <stop offset="55%" stopColor="#1a2b45" />
          <stop offset="100%" stopColor="#101a2c" />
        </radialGradient>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f2dc9a" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a67c2a" />
        </linearGradient>
        <radialGradient id={vignetteId} cx="50%" cy="50%" r="58%">
          <stop offset="72%" stopColor="#00000000" />
          <stop offset="100%" stopColor="#00000055" />
        </radialGradient>
      </defs>

      <rect x="8" y="8" width="484" height="684" rx={CARD_RX} fill={`url(#${bgId})`} />
      <rect x="8" y="8" width="484" height="684" rx={CARD_RX} fill={`url(#${vignetteId})`} />

      <rect
        x="8"
        y="8"
        width="484"
        height="684"
        rx={CARD_RX}
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="12"
      />
      <rect
        x="28"
        y="28"
        width="444"
        height="644"
        rx={CARD_RX - 8}
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="2.5"
        opacity="0.92"
      />
      <rect
        x="44"
        y="44"
        width="412"
        height="612"
        rx={CARD_RX - 12}
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="1.25"
        opacity="0.55"
      />

      {(
        [
          [44, 44, 1, 1],
          [456, 44, -1, 1],
          [456, 656, -1, -1],
          [44, 656, 1, -1],
        ] as const
      ).map(([cx, cy, sx, sy], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${sx} ${sy})`} stroke={`url(#${goldId})`} strokeWidth="2" opacity="0.7">
          <path d="M 18 0 H 42" fill="none" strokeLinecap="square" />
          <path d="M 0 18 V 42" fill="none" strokeLinecap="square" />
          <path d="M 18 0 L 0 18" fill="none" strokeLinecap="square" />
        </g>
      ))}

      {/* Compass ticks */}
      <g transform="translate(250 350)" stroke={`url(#${goldId})`} opacity="0.55">
        {Array.from({ length: 24 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1="-118"
            x2="0"
            y2={i % 6 === 0 ? -102 : -110}
            transform={`rotate(${(360 / 24) * i})`}
            strokeWidth={i % 6 === 0 ? 2 : 1}
          />
        ))}
      </g>

      {/* Cardinal dots */}
      <g fill={`url(#${goldId})`}>
        <circle cx="250" cy="228" r="5.5" />
        <circle cx="250" cy="472" r="5.5" />
        <circle cx="128" cy="350" r="5.5" />
        <circle cx="372" cy="350" r="5.5" />
      </g>

      <circle cx="250" cy="350" r="74" fill="none" stroke={`url(#${goldId})`} strokeWidth="2.5" opacity="0.85" />

      {/* Four-point star */}
      <path
        d="M 250 292 L 268 350 L 250 408 L 232 350 Z"
        fill={`url(#${goldId})`}
        opacity="0.95"
      />
    </svg>
  )
}
