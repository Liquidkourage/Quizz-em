import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { formatVenueDisplayPlayerName } from './venueLeaderboard'
import { resolvePostHandBeat } from './postHandBeats'
import { nowOnServerClock } from './serverClock'

type PostHandBeatOverlayProps = {
  wall: DisplayVenueWallSnapshot | null
}

function PayoutCard({ bustNames }: { bustNames: string[] }) {
  return (
    <div className="flex max-w-[min(52rem,92vw)] flex-col items-center gap-3 text-center">
      <p className="text-[clamp(0.75rem,1.6vw,1rem)] font-black uppercase tracking-[0.22em] text-amber-200/90">
        Hand settled
      </p>
      <h2 className="font-[family-name:var(--font-display,Rajdhani,system-ui,sans-serif)] text-[clamp(2.4rem,6vw,4.5rem)] font-black leading-none text-amber-50">
        Payout
      </h2>
      <p className="max-w-xl text-[clamp(1rem,2.2vw,1.35rem)] leading-snug text-white/75">
        Closest constructable guesses take the pots. Trivia points are locked for the night race.
      </p>
      {bustNames.length > 0 ? (
        <p className="mt-1 text-[clamp(0.95rem,2vw,1.2rem)] font-semibold text-violet-200/90">
          Second life · {bustNames.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

/** Full-bleed payout card after End Round, before the auto leaderboard. */
export default function PostHandBeatOverlay({ wall }: PostHandBeatOverlayProps) {
  const now = nowOnServerClock()
  const kind = resolvePostHandBeat(wall?.postHandBeatStartedAtMs, now)
  const bustNames = (wall?.lastHandBusts ?? [])
    .map((b) => formatVenueDisplayPlayerName(b.name))
    .filter(Boolean)
    .slice(0, 6)

  return (
    <AnimatePresence>
      {kind != null ? (
        <motion.div
          key={kind}
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-black/72 px-6 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <PayoutCard bustNames={bustNames} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
