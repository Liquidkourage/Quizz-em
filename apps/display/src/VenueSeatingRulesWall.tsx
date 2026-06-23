import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  VENUE_SEATING_RULES_HEADLINE,
  VENUE_SEATING_RULES_SECTIONS,
  VENUE_SEATING_RULES_TAGLINE,
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
        className="relative z-10 flex min-h-0 flex-1 flex-col px-[clamp(1rem,2.5vw,2.5rem)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
        initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="mb-[clamp(0.75rem,1.8vmin,1.25rem)] flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-amber-500/35 pb-[clamp(0.65rem,1.4vmin,1rem)]">
          <div className="flex min-w-0 items-center gap-[clamp(0.65rem,1.5vw,1.25rem)]">
            <div className="w-[clamp(5.5rem,11vw,9rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
              <QuizzEmWordmark layout="fill" />
            </div>
            <div className="min-w-0">
              <h1 className="venue-rules-headline text-balance font-black leading-tight tracking-tight text-amber-300">
                {VENUE_SEATING_RULES_HEADLINE}
              </h1>
              <p className="venue-rules-tagline mt-1 max-w-[52ch] text-pretty font-medium leading-snug text-white/72">
                {VENUE_SEATING_RULES_TAGLINE}
              </p>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-[clamp(0.65rem,1.4vmin,1rem)] lg:grid-cols-2 lg:grid-rows-2 lg:gap-[clamp(0.75rem,1.6vmin,1.15rem)]">
          {VENUE_SEATING_RULES_SECTIONS.map((section, index) => (
            <motion.section
              key={section.title}
              className="venue-rules-panel flex min-h-0 flex-col rounded-xl border border-amber-500/30 bg-black/45 px-[clamp(0.85rem,1.8vw,1.35rem)] py-[clamp(0.75rem,1.5vw,1.15rem)] shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] backdrop-blur-sm"
              initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: skipMountIntro ? 0 : 0.06 * index }}
            >
              <h2 className="venue-rules-section-title shrink-0 font-black uppercase tracking-wide text-emerald-200/95">
                {section.title}
              </h2>
              <ul className="venue-rules-list mt-[clamp(0.45rem,1vmin,0.75rem)] min-h-0 flex-1 list-none space-y-[clamp(0.35rem,0.85vmin,0.65rem)] p-0">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-[0.55em] leading-snug text-white/88">
                    <span className="mt-[0.45em] size-[0.42em] shrink-0 rounded-full bg-amber-400/90" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
