import { useId, type SVGAttributes } from 'react'
import { clampCardDigit } from './cardFaceAssets'

const VIEW_W = 500
const VIEW_H = 700
const CARD_RX = 36

/** Vector card front — navy felt + gold frame; digit swaps for 0–9. */
function CardMarks({ gold, label }: { gold: string; label: string }) {
  if (label === '.') {
    return (
      <>
        <circle cx="250" cy="360" r="78" fill={gold} />
        <circle cx="86" cy="88" r="16" fill={gold} />
        <circle cx="414" cy="612" r="16" fill={gold} transform="rotate(180 414 612)" />
      </>
    )
  }
  return (
    <>
      <text
        x="250"
        y="372"
        textAnchor="middle"
        dominantBaseline="central"
        fill={gold}
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="248"
        letterSpacing="-6"
      >
        {label}
      </text>
      <text
        x="62"
        y="92"
        fill={gold}
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="56"
      >
        {label}
      </text>
      <text
        x="438"
        y="608"
        fill={gold}
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="56"
        textAnchor="end"
        dominantBaseline="auto"
        transform="rotate(180 438 608)"
      >
        {label}
      </text>
    </>
  )
}

export function CardFaceSvg({
  digit,
  decimal = false,
  className,
  style,
  ...props
}: { digit: number; decimal?: boolean } & Omit<SVGAttributes<SVGSVGElement>, 'children'>) {
  const uid = useId().replace(/:/g, '')
  const label = decimal ? '.' : String(clampCardDigit(digit))
  const bgId = `card-bg-${uid}`
  const goldId = `card-gold-${uid}`
  const vignetteId = `card-vignette-${uid}`

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      shapeRendering="geometricPrecision"
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

      {/* Felt */}
      <rect x="8" y="8" width="484" height="684" rx={CARD_RX} fill={`url(#${bgId})`} />
      <rect x="8" y="8" width="484" height="684" rx={CARD_RX} fill={`url(#${vignetteId})`} />

      {/* Outer gold rail */}
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

      {/* Inner pinstripe */}
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

      {/* Decorative inner frame */}
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

      {/* Corner accents */}
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

      <CardMarks gold={`url(#${goldId})`} label={label} />
    </svg>
  )
}

export const CARD_FACE_VIEWBOX = { width: VIEW_W, height: VIEW_H } as const
