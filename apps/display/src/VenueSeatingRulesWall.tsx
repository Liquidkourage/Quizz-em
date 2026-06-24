import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  VENUE_RULES_WALL_HEADLINE,
  VENUE_RULES_WALL_SECTIONS,
  type VenueRulesWallBulletGroup,
  type VenueRulesWallSection,
} from './venueRulesWallContent'

export type VenueSeatingRulesWallProps = {
  skipMountIntro?: boolean
}

function RulesBulletList({
  bullets,
  skipMountIntro,
  startIndex,
}: {
  bullets: readonly string[]
  skipMountIntro: boolean
  startIndex: number
}) {
  return (
    <ul className="venue-rules-list m-0 list-none space-y-[clamp(0.3rem,0.65vmin,0.55rem)] p-0">
      {bullets.map((bullet, index) => {
        const delayIndex = startIndex + index
        return (
          <motion.li
            key={bullet}
            className="flex gap-[clamp(0.5rem,1vmin,0.85rem)] text-pretty text-left font-bold leading-[1.22] text-white/92"
            initial={skipMountIntro ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: skipMountIntro ? 0 : 0.05 * delayIndex }}
          >
            <span
              className="venue-rules-bullet mt-[0.18em] shrink-0 font-black leading-none text-amber-400/95"
              aria-hidden
            >
              •
            </span>
            <span>{bullet}</span>
          </motion.li>
        )
      })}
    </ul>
  )
}

function RulesSectionBody({
  section,
  skipMountIntro,
  startIndex,
}: {
  section: VenueRulesWallSection
  skipMountIntro: boolean
  startIndex: number
}) {
  if (section.groups?.length) {
    let offset = startIndex
    return (
      <div className="mt-[clamp(0.4rem,0.85vmin,0.65rem)] space-y-[clamp(0.45rem,0.95vmin,0.75rem)]">
        {section.groups.map((group: VenueRulesWallBulletGroup) => {
          const groupStart = offset
          offset += group.bullets.length
          return (
            <div key={group.title}>
              <h3 className="venue-rules-group-title mb-[clamp(0.25rem,0.5vmin,0.4rem)] font-black uppercase tracking-wide text-amber-100/75">
                {group.title}
              </h3>
              <RulesBulletList
                bullets={group.bullets}
                skipMountIntro={skipMountIntro}
                startIndex={groupStart}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-[clamp(0.4rem,0.85vmin,0.65rem)]">
      <RulesBulletList
        bullets={section.bullets ?? []}
        skipMountIntro={skipMountIntro}
        startIndex={startIndex}
      />
    </div>
  )
}

export default function VenueSeatingRulesWall({ skipMountIntro = false }: VenueSeatingRulesWallProps) {
  let bulletIndex = 0

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
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col justify-center gap-[clamp(0.75rem,1.6vmin,1.35rem)] px-[clamp(0.85rem,2vw,2rem)] py-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex shrink-0 flex-col items-center gap-[clamp(0.45rem,1vmin,0.75rem)] text-center">
          <div className="w-[clamp(4rem,8vw,6.5rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
          <h1 className="venue-rules-headline font-black leading-tight tracking-tight text-amber-300">
            {VENUE_RULES_WALL_HEADLINE}
          </h1>
        </header>

        <div className="grid min-h-0 grid-cols-1 gap-[clamp(0.75rem,1.6vmin,1.15rem)] lg:grid-cols-2 lg:items-start">
          {VENUE_RULES_WALL_SECTIONS.map((section, sectionIndex) => {
            const sectionStart = bulletIndex
            const sectionBulletCount =
              section.bullets?.length ??
              section.groups?.reduce((sum, group) => sum + group.bullets.length, 0) ??
              0
            bulletIndex += sectionBulletCount

            return (
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
                <RulesSectionBody
                  section={section}
                  skipMountIntro={skipMountIntro}
                  startIndex={sectionStart}
                />
              </motion.section>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
