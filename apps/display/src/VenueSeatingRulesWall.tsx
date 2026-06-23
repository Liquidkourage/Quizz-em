import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  VENUE_SEATING_RULES_HEADLINE,
  VENUE_SEATING_RULES_LINES,
} from './venueSeatingRulesContent'

export type VenueSeatingRulesWallProps = {
  skipMountIntro?: boolean
}

export default function VenueSeatingRulesWall({ skipMountIntro = false }: VenueSeatingRulesWallProps) {
  return (
    <div
      className="venue-rules-wall flex min-h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white"
      role="region"
      aria-label={VENUE_SEATING_RULES_HEADLINE}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 12%, rgba(251, 191, 36, 0.08) 0%, transparent 42%),
            radial-gradient(circle at 82% 88%, rgba(52, 211, 153, 0.06) 0%, transparent 40%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(2, 6, 23, 0.85) 100%)
          `,
        }}
      />

      <motion.div
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center gap-[clamp(1.25rem,2.8vmin,2.25rem)] px-[clamp(1.25rem,3vw,3rem)] py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-center"
        initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-[clamp(6rem,12vw,10rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
          <QuizzEmWordmark layout="fill" />
        </div>
        <h1 className="venue-rules-headline font-black leading-tight tracking-tight text-amber-300">
          {VENUE_SEATING_RULES_HEADLINE}
        </h1>
        <ul className="venue-rules-list m-0 max-w-3xl list-none space-y-[clamp(0.85rem,1.8vmin,1.35rem)] p-0">
          {VENUE_SEATING_RULES_LINES.map((line, index) => (
            <motion.li
              key={line}
              className="text-pretty font-semibold leading-snug text-white/88"
              initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: skipMountIntro ? 0 : 0.1 * index }}
            >
              {line}
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  )
}
