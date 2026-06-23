import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  VENUE_RULES_WALL_HEADLINE,
  VENUE_RULES_WALL_SECTIONS,
} from './venueRulesWallContent'

export type VenueSeatingRulesWallProps = {
  skipMountIntro?: boolean
}

export default function VenueSeatingRulesWall({ skipMountIntro = false }: VenueSeatingRulesWallProps) {
  let lineIndex = 0

  return (
    <div
      className="venue-rules-wall flex min-h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white"
      role="region"
      aria-label={VENUE_RULES_WALL_HEADLINE}
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
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col justify-center gap-[clamp(1rem,2.2vmin,1.75rem)] px-[clamp(1rem,2.5vw,2.5rem)] py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex shrink-0 flex-col items-center gap-[clamp(0.65rem,1.4vmin,1rem)] text-center">
          <div className="w-[clamp(5rem,10vw,8rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
          <h1 className="venue-rules-headline font-black leading-tight tracking-tight text-amber-300">
            {VENUE_RULES_WALL_HEADLINE}
          </h1>
        </header>

        <div className="grid min-h-0 grid-cols-1 gap-[clamp(0.75rem,1.6vmin,1.15rem)] lg:grid-cols-2 lg:items-start">
          {VENUE_RULES_WALL_SECTIONS.map((section, sectionIndex) => (
            <motion.section
              key={section.title}
              className="venue-rules-panel rounded-2xl border border-amber-500/30 bg-black/45 px-[clamp(0.95rem,1.9vw,1.45rem)] py-[clamp(0.85rem,1.7vw,1.25rem)] shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] backdrop-blur-sm"
              initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: skipMountIntro ? 0 : 0.08 * sectionIndex }}
            >
              <h2 className="venue-rules-section-title text-center font-black uppercase tracking-wide text-emerald-200/95">
                {section.title}
              </h2>
              <ul className="venue-rules-list m-0 mt-[clamp(0.55rem,1.1vmin,0.85rem)] list-none space-y-[clamp(0.55rem,1.1vmin,0.85rem)] p-0">
                {section.lines.map((line) => {
                  const delayIndex = lineIndex++
                  return (
                    <motion.li
                      key={line}
                      className="text-pretty text-left font-semibold leading-snug text-white/88"
                      initial={skipMountIntro ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, delay: skipMountIntro ? 0 : 0.05 * delayIndex }}
                    >
                      {line}
                    </motion.li>
                  )
                })}
              </ul>
            </motion.section>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
