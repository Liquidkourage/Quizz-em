import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  VENUE_SEATING_RULES_HEADLINE,
  VENUE_SEATING_RULES_LEAD,
  VENUE_SEATING_RULES_SECTIONS,
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
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center px-[clamp(1.25rem,3vw,3rem)] py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
        initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="mb-[clamp(1rem,2.2vmin,1.75rem)] flex shrink-0 flex-col items-center gap-[clamp(0.75rem,1.6vmin,1.25rem)] text-center">
          <div className="w-[clamp(6rem,12vw,10rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
          <div className="min-w-0 max-w-3xl">
            <h1 className="venue-rules-headline font-black leading-tight tracking-tight text-amber-300">
              {VENUE_SEATING_RULES_HEADLINE}
            </h1>
            <p className="venue-rules-lead mt-[clamp(0.65rem,1.4vmin,1rem)] text-pretty font-semibold leading-snug text-white/88">
              {VENUE_SEATING_RULES_LEAD}
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-col gap-[clamp(0.75rem,1.5vmin,1.15rem)]">
          {VENUE_SEATING_RULES_SECTIONS.map((section, index) => (
            <motion.section
              key={section.title}
              className="venue-rules-panel rounded-2xl border border-amber-500/30 bg-black/45 px-[clamp(1.1rem,2.2vw,1.75rem)] py-[clamp(1rem,2vw,1.5rem)] shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] backdrop-blur-sm"
              initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: skipMountIntro ? 0 : 0.08 * index }}
            >
              <h2 className="venue-rules-section-title text-center font-black uppercase tracking-wide text-emerald-200/95">
                {section.title}
              </h2>
              <ul className="venue-rules-list mx-auto mt-[clamp(0.65rem,1.2vmin,0.95rem)] max-w-2xl list-none space-y-[clamp(0.5rem,1vmin,0.85rem)] p-0">
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
