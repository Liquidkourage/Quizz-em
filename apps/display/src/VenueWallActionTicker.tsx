import { motion } from 'framer-motion'

type VenueWallActionTickerProps = {
  lines: string[]
  prefersReducedMotion: boolean
}

/**
 * Scrolling rail of every open “to call” line — used during the actionTicker view cycle.
 */
export default function VenueWallActionTicker({ lines, prefersReducedMotion }: VenueWallActionTickerProps) {
  if (lines.length === 0) return null

  const joined = lines.join('   ·   ')
  const doubled = `${joined}   ·   ${joined}`

  return (
    <div
      className="shrink-0 overflow-hidden rounded-xl border-2 border-amber-400/55 bg-amber-950/85 px-3 py-2 sm:px-4 sm:py-2.5"
      aria-live="polite"
      aria-label={`Open action: ${lines.join('; ')}`}
    >
      {prefersReducedMotion ? (
        <p className="text-center text-sm font-black leading-snug tracking-tight text-amber-50 sm:text-base">
          {joined}
        </p>
      ) : (
        <div className="relative flex overflow-hidden">
          <motion.div
            className="flex shrink-0 whitespace-nowrap text-sm font-black leading-snug tracking-tight text-amber-50 sm:text-base"
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: Math.max(18, lines.length * 4),
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <span className="pr-12">{doubled}</span>
          </motion.div>
        </div>
      )}
    </div>
  )
}
