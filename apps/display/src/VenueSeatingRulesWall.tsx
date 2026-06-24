import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  VENUE_RULES_WALL_COLUMNS,
  VENUE_RULES_WALL_HEADLINE,
  type VenueRulesWallBulletGroup,
  type VenueRulesWallColumn,
} from './venueRulesWallContent'

export type VenueSeatingRulesWallProps = {
  skipMountIntro?: boolean
}

function countBullets(groups: readonly VenueRulesWallBulletGroup[]): number {
  return groups.reduce((sum, group) => sum + group.bullets.length, 0)
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
    <ul className="venue-rules-list m-0 list-none space-y-[clamp(0.55rem,1.15vmin,0.95rem)] p-0">
      {bullets.map((bullet, index) => {
        const delayIndex = startIndex + index
        return (
          <motion.li
            key={bullet}
            className="flex gap-[clamp(0.55rem,1.05vmin,0.95rem)] text-pretty text-left font-semibold leading-[1.26] text-white/92"
            initial={skipMountIntro ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: skipMountIntro ? 0 : 0.04 * delayIndex }}
          >
            <span
              className="venue-rules-bullet mt-[0.12em] shrink-0 font-black leading-none text-amber-400/95"
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

function RulesColumn({
  column,
  skipMountIntro,
  startIndex,
  showDivider,
}: {
  column: VenueRulesWallColumn
  skipMountIntro: boolean
  startIndex: number
  showDivider?: boolean
}) {
  let offset = startIndex

  return (
    <div
      className={
        showDivider
          ? 'flex min-h-0 min-w-0 flex-1 flex-col lg:border-l lg:border-amber-500/25 lg:pl-[clamp(1.5rem,3vw,3rem)]'
          : 'flex min-h-0 min-w-0 flex-1 flex-col'
      }
    >
      <h2 className="venue-rules-section-title shrink-0 text-center font-black uppercase tracking-wide text-emerald-200/95 lg:text-left">
        {column.title}
      </h2>
      <div className="mt-[clamp(0.85rem,1.6vmin,1.25rem)] flex min-h-0 flex-1 flex-col justify-evenly gap-[clamp(1rem,2.2vmin,2rem)]">
        {column.groups.map((group) => {
          const groupStart = offset
          offset += group.bullets.length
          return (
            <div key={group.title}>
              <h3 className="venue-rules-group-title mb-[clamp(0.45rem,0.85vmin,0.7rem)] font-black uppercase tracking-wide text-amber-100/85">
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
    </div>
  )
}

export default function VenueSeatingRulesWall({ skipMountIntro = false }: VenueSeatingRulesWallProps) {
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
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col gap-[clamp(0.65rem,1.35vmin,1rem)] px-[clamp(1.25rem,3.5vw,4rem)] py-[max(0.65rem,env(safe-area-inset-top))] pb-[max(0.65rem,env(safe-area-inset-bottom))]"
        initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex shrink-0 flex-col items-center gap-[clamp(0.35rem,0.75vmin,0.55rem)] text-center">
          <div className="w-[clamp(5rem,10vw,8.5rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
          <h1 className="venue-rules-headline font-black leading-tight tracking-tight text-amber-300">
            {VENUE_RULES_WALL_HEADLINE}
          </h1>
        </header>

        <motion.section
          className="venue-rules-panel flex min-h-0 w-full flex-1 flex-col rounded-[clamp(1rem,2vmin,1.75rem)] border-2 border-amber-500/40 bg-black/55 px-[clamp(1.35rem,3vw,3.25rem)] py-[clamp(1.25rem,2.8vmin,2.75rem)] shadow-[inset_0_1px_0_rgba(251,191,36,0.12),0_22px_56px_rgba(0,0,0,0.4)] backdrop-blur-sm"
          initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: skipMountIntro ? 0 : 0.08 }}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-[clamp(1.5rem,3vmin,2.75rem)] lg:grid-cols-2 lg:items-stretch">
            <RulesColumn
              column={VENUE_RULES_WALL_COLUMNS[0]!}
              skipMountIntro={skipMountIntro}
              startIndex={0}
            />
            <RulesColumn
              column={VENUE_RULES_WALL_COLUMNS[1]!}
              skipMountIntro={skipMountIntro}
              startIndex={countBullets(VENUE_RULES_WALL_COLUMNS[0]!.groups)}
              showDivider
            />
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
