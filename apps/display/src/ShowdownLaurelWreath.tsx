import { useId, type SVGAttributes } from 'react'
import { clsx } from 'clsx'

/** Decorative gold laurel — unmistakable deploy marker on mosaic winner overlays. */
export function ShowdownLaurelWreath({
  className,
  ...props
}: SVGAttributes<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const goldId = `showdown-laurel-gold-${uid}`
  const glowId = `showdown-laurel-glow-${uid}`

  return (
    <svg
      viewBox="0 0 420 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={clsx('pointer-events-none select-none', className)}
      {...props}
    >
      <defs>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff1c2" />
          <stop offset="38%" stopColor="#e2ad1a" />
          <stop offset="100%" stopColor="#9a7018" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#fbbf24" floodOpacity="0.45" />
        </filter>
      </defs>
      <g fill={`url(#${goldId})`} filter={`url(#${glowId})`}>
        {/* Left branch */}
        <path d="M28 78 C48 58 62 42 78 28 C70 40 58 54 48 68 C42 76 34 82 28 78 Z" />
        <path d="M38 88 C58 68 72 52 88 38 C80 50 68 64 58 78 C52 86 44 92 38 88 Z" />
        <path d="M48 96 C68 76 82 60 98 46 C90 58 78 72 68 86 C62 94 54 100 48 96 Z" />
        <path d="M58 102 C78 82 92 66 108 52 C100 64 88 78 78 92 C72 100 64 106 58 102 Z" />
        <path d="M68 106 C88 86 102 70 118 56 C110 68 98 82 88 96 C82 104 74 110 68 106 Z" />
        <path d="M78 108 C98 88 112 72 128 58 C120 70 108 84 98 98 C92 106 84 112 78 108 Z" />
        <path d="M88 108 C108 88 122 72 138 58 C130 70 118 84 108 98 C102 106 94 112 88 108 Z" />
        <path d="M98 106 C118 86 132 70 148 56 C140 68 128 82 118 96 C112 104 104 110 98 106 Z" />
        <path d="M108 102 C128 82 142 66 158 52 C150 64 138 78 128 92 C122 100 114 106 108 102 Z" />
        <path d="M118 96 C138 76 152 60 168 46 C160 58 148 72 138 86 C132 94 124 100 118 96 Z" />
        <path d="M128 88 C148 68 162 52 178 38 C170 50 158 64 148 78 C142 86 134 92 128 88 Z" />
        <path d="M138 78 C158 58 172 42 188 28 C180 40 168 54 158 68 C152 76 144 82 138 78 Z" />
        {/* Right branch (mirrored) */}
        <path d="M392 78 C372 58 358 42 342 28 C350 40 362 54 372 68 C378 76 386 82 392 78 Z" />
        <path d="M382 88 C362 68 348 52 332 38 C340 50 352 64 362 78 C368 86 376 92 382 88 Z" />
        <path d="M372 96 C352 76 338 60 322 46 C330 58 342 72 352 86 C358 94 366 100 372 96 Z" />
        <path d="M362 102 C342 82 328 66 312 52 C320 64 332 78 342 92 C348 100 356 106 362 102 Z" />
        <path d="M352 106 C332 86 318 70 302 56 C310 68 322 82 332 96 C338 104 346 110 352 106 Z" />
        <path d="M342 108 C322 88 308 72 292 58 C300 70 312 84 322 98 C328 106 336 112 342 108 Z" />
        <path d="M332 108 C312 88 298 72 282 58 C290 70 302 84 312 98 C318 106 326 112 332 108 Z" />
        <path d="M322 106 C302 86 288 70 272 56 C280 68 292 82 302 96 C308 104 316 110 322 106 Z" />
        <path d="M312 102 C292 82 278 66 262 52 C270 64 282 78 292 92 C298 100 306 106 312 102 Z" />
        <path d="M302 96 C282 76 268 60 252 46 C260 58 272 72 282 86 C288 94 296 100 302 96 Z" />
        <path d="M292 88 C272 68 258 52 242 38 C250 50 262 64 272 78 C278 86 286 92 292 88 Z" />
        <path d="M282 78 C262 58 248 42 232 28 C240 40 252 54 262 68 C268 76 276 82 282 78 Z" />
        {/* Bottom tie */}
        <ellipse cx="210" cy="108" rx="18" ry="8" opacity="0.85" />
      </g>
    </svg>
  )
}
