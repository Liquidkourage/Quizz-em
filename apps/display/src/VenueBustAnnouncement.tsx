import { motion, useReducedMotion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueBustEntry } from '@qhe/net'

function displayPlayerName(raw: string): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!s) return '—'
  const parts = s.split(' ')
  if (parts[0].toUpperCase() === 'CPU' && parts.length >= 2) return s
  const first = parts[0]
  const lastInitial = parts.length > 1 ? parts[parts.length - 1]![0] : ''
  return lastInitial ? `${first} ${lastInitial}.` : first
}

export type VenueBustAnnouncementProps = {
  busts: DisplayVenueBustEntry[]
}

export default function VenueBustAnnouncement({ busts }: VenueBustAnnouncementProps) {
  const reducedMotion = useReducedMotion()
  const title = busts.length === 1 ? 'Player eliminated' : 'Players eliminated'

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/82 px-6 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_42%,rgba(239,68,68,0.16),transparent_68%)]"
        aria-hidden
      />

      <motion.div
        className="relative flex max-h-[min(88vh,calc(100dvh-3rem))] w-full max-w-[min(52rem,96vw)] flex-col rounded-2xl border border-red-500/45 bg-gradient-to-b from-[#1a0508] via-[#12040a] to-black/90 px-6 py-7 shadow-[0_0_48px_rgba(239,68,68,0.22)] sm:px-10 sm:py-9"
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 shrink-0 flex items-center justify-between gap-4 border-b border-red-500/25 pb-4">
          <div className="min-w-0">
            <p className="font-orbitron text-[clamp(0.72rem,1.35vw,0.92rem)] font-bold uppercase tracking-[0.22em] text-red-300/90">
              {title}
              {busts.length > 1 ? (
                <span className="ml-2 text-red-200/70">· {busts.length}</span>
              ) : null}
            </p>
            <h2 className="mt-1 font-orbitron text-[clamp(1.65rem,3.8vw,2.75rem)] font-black uppercase leading-none tracking-[0.06em] text-red-50">
              Out of the tournament
            </h2>
          </div>
          <div className="hidden w-[clamp(4.5rem,11vw,7rem)] shrink-0 sm:block">
            <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </div>

        <ul className="grid min-h-0 flex-1 gap-2.5 overflow-y-auto overscroll-contain pr-0.5 sm:grid-cols-2 sm:gap-3 sm:pr-1">
          {busts.map((b, index) => (
            <motion.li
              key={`${b.name}-${b.tableNum}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-950/35 px-4 py-3"
              initial={reducedMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.32,
                delay: reducedMotion ? 0 : 0.08 + index * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className="min-w-0 truncate text-[clamp(1.15rem,2.2vw,1.65rem)] font-bold leading-tight text-red-50">
                {displayPlayerName(b.name)}
              </span>
              <span className="shrink-0 rounded-md border border-red-400/35 bg-black/40 px-2 py-0.5 font-orbitron text-[clamp(0.78rem,1.2vw,0.95rem)] font-bold uppercase tracking-wider text-red-200/85">
                Table {b.tableNum}
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}
