import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueSeatingAnnouncement } from '@qhe/net'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'

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

function seatingTitle(seating: DisplayVenueSeatingAnnouncement): string {
  if (seating.shuffled) return 'Tables shuffled'
  if (seating.moves.length > 0 && seating.closedTableNums.length > 0) return 'Seating update'
  if (seating.moves.length > 1) return 'Players moved'
  if (seating.moves.length === 1) return 'Player moved'
  if (seating.closedTableNums.length > 1) return 'Tables closed'
  return 'Table closed'
}

function seatingEyebrow(seating: DisplayVenueSeatingAnnouncement): string {
  const parts: string[] = []
  if (seating.shuffled) parts.push('Full shuffle')
  if (seating.moves.length > 0) {
    parts.push(`${seating.moves.length} move${seating.moves.length === 1 ? '' : 's'}`)
  }
  if (seating.closedTableNums.length > 0) {
    parts.push(`${seating.closedTableNums.length} closed`)
  }
  return parts.join(' · ')
}

export default function VenueSeatingAnnouncement({
  seating,
}: {
  seating: DisplayVenueSeatingAnnouncement
}) {
  const reducedMotion = useReducedMotion()
  const title = seatingTitle(seating)
  const rows = useMemo(() => {
    const out: { key: string; label: string; detail: string }[] = []
    for (const m of seating.moves) {
      out.push({
        key: `${m.name}-${m.fromTableNum}-${m.toTableNum}`,
        label: displayPlayerName(m.name),
        detail: `Table ${m.fromTableNum} → Table ${m.toTableNum}`,
      })
    }
    for (const n of seating.closedTableNums) {
      out.push({
        key: `closed-${n}`,
        label: `Table ${n}`,
        detail: 'Closed',
      })
    }
    return out
  }, [seating])

  const compact = rows.length > 4

  return (
    <motion.div
      className="fixed inset-0 z-[195] flex items-center justify-center overflow-hidden bg-black/78 px-6 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <DisplayWelcomeBackdrop />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.14),transparent_62%)]"
        aria-hidden
      />

      <motion.div
        className={`venue-bust-overlay-panel relative z-10 flex w-full flex-col border-cyan-400/45 shadow-[0_0_28px_rgba(34,211,238,0.18)] ${
          compact ? 'venue-bust-overlay-panel--compact' : ''
        }`}
        style={{ maxWidth: compact ? 'min(92vw, 52rem)' : 'min(92vw, 44rem)' }}
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`venue-bust-overlay-header ${
            compact ? 'venue-bust-overlay-header--compact' : ''
          }`}
        >
          <div className="min-w-0">
            <p className="venue-bust-overlay-eyebrow text-cyan-300/90">{seatingEyebrow(seating)}</p>
            <h2
              className={`venue-bust-overlay-title ${
                compact ? 'venue-bust-overlay-title--compact' : ''
              }`}
            >
              {title}
            </h2>
            {seating.shuffled ? (
              <p className="mt-2 text-sm text-white/75 sm:text-base">
                {seating.tablesBefore} → {seating.tablesAfter} tables · {seating.playerCount}{' '}
                players — check your phone for your new table
              </p>
            ) : null}
          </div>
          <QuizzEmWordmark
            className={`venue-bust-overlay-wordmark hidden shrink-0 sm:block ${
              compact ? 'venue-bust-overlay-wordmark--compact' : ''
            }`}
          />
        </div>

        {rows.length > 0 ? (
          <div
            className={`venue-bust-overlay-grid ${compact ? 'venue-bust-overlay-grid--compact' : ''}`}
          >
            {rows.map((row) => (
              <div
                key={row.key}
                className={`venue-bust-overlay-row border-cyan-500/20 ${
                  compact ? 'venue-bust-overlay-row--compact' : ''
                }`}
              >
                <span
                  className={`venue-bust-overlay-name ${
                    compact ? 'venue-bust-overlay-name--compact' : ''
                  }`}
                >
                  {row.label}
                </span>
                <span className="venue-bust-overlay-table-well text-cyan-100/90">{row.detail}</span>
              </div>
            ))}
          </div>
        ) : seating.shuffled ? (
          <p className="px-1 pb-1 text-center text-sm text-white/70 sm:text-base">
            Everyone has a new seat assignment.
          </p>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
