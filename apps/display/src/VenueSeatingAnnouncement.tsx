import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueBustEntry, DisplayVenueSeatingAnnouncement } from '@qhe/net'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import { SeatingChartPageClock } from './SeatingChartNameRoster'
import { seatingOverlayDurationMs } from './useVenueSeatingAnnouncement'

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

function seatingTitle(seating: DisplayVenueSeatingAnnouncement, bustCount: number): string {
  if (seating.shuffled) return 'TABLE SHUFFLE'
  if (bustCount > 0 && (seating.moves.length > 0 || seating.closedTableNums.length > 0)) return 'Seating update'
  if (seating.moves.length > 0 && seating.closedTableNums.length > 0) return 'Seating update'
  if (seating.moves.length > 1) return 'Players moved'
  if (seating.moves.length === 1) return 'Player moved'
  if (seating.closedTableNums.length > 1) return 'Tables closed'
  return 'Table closed'
}

function droppedTableByline(seating: DisplayVenueSeatingAnnouncement, tableNum: number): string {
  const labels = new Set<string>()
  for (const move of seating.moves) {
    if (move.fromTableNum !== tableNum) continue
    const byline = move.byline?.trim()
    if (byline) labels.add(byline)
  }
  if (labels.size === 1) return [...labels][0]!
  if (seating.shuffled) return 'TABLE SHUFFLE'
  return ''
}

/** A short update is one full-width row so the type can fill the TV. */
function seatingColumns(count: number): number {
  if (count <= 3) return 1
  if (count <= 8) return 2
  if (count <= 12) return 3
  if (count <= 20) return 4
  return 5
}

function samePlayer(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function rowMarks(eliminated: boolean, byline: string): string[] {
  const marks: string[] = []
  if (eliminated) marks.push('ELIMINATED')
  if (byline) marks.push(byline)
  return marks
}

function seatingRowClass(closed: boolean, compact: boolean): string {
  const parts = ['venue-bust-overlay-row border-cyan-500/20']
  if (closed) parts.push('venue-bust-overlay-row--closed')
  if (compact) parts.push('venue-bust-overlay-row--compact')
  return parts.join(' ')
}

function seatingEyebrow(seating: DisplayVenueSeatingAnnouncement, bustCount: number): string {
  const parts: string[] = []
  if (bustCount > 0) parts.push(`${bustCount} eliminated`)
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
  busts = [],
}: {
  seating: DisplayVenueSeatingAnnouncement
  busts?: DisplayVenueBustEntry[]
}) {
  const reducedMotion = useReducedMotion()
  const title = seatingTitle(seating, busts.length)

  const rows = useMemo(() => {
    const out: { key: string; label: string; detail: string; marks: string[]; closed: boolean }[] = []
    const usedBust = new Set<number>()
    for (const m of seating.moves) {
      const bustAt = busts.findIndex((bust, index) => !usedBust.has(index) && samePlayer(bust.name, m.name))
      if (bustAt >= 0) usedBust.add(bustAt)
      out.push({
        key: `${m.name}-${m.fromTableNum}-${m.toTableNum}`,
        label: displayPlayerName(m.name),
        detail: `Table ${m.fromTableNum} → Table ${m.toTableNum}`,
        marks: rowMarks(bustAt >= 0, m.byline?.trim() ?? ''),
        closed: false,
      })
    }
    busts.forEach((bust, index) => {
      if (usedBust.has(index)) return
      out.push({
        key: `out-${bust.name}-${bust.tableNum}`,
        label: displayPlayerName(bust.name),
        detail: `Table ${bust.tableNum}`,
        marks: ['ELIMINATED'],
        closed: false,
      })
    })
    for (const n of seating.closedTableNums) {
      out.push({
        key: `closed-${n}`,
        label: `Table ${n}`,
        detail: 'Closed',
        marks: rowMarks(false, droppedTableByline(seating, n)),
        closed: true,
      })
    }
    return out
  }, [busts, seating])

  const columns = seatingColumns(rows.length)
  const compact = rows.length > 10

  return (
    <motion.div
      className="fixed inset-0 z-[195] flex items-stretch justify-center overflow-hidden bg-black/78 p-3 backdrop-blur-md"
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
        className={`venue-seating-move venue-seating-update venue-bust-overlay-panel relative z-10 flex h-full w-full flex-col border-cyan-400/45 shadow-[0_0_28px_rgba(34,211,238,0.18)] ${
          compact ? 'venue-bust-overlay-panel--compact' : ''
        }`}
        style={{ width: '100%', height: '100%', maxWidth: 'none' }}
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
            <p className="venue-bust-overlay-eyebrow text-cyan-300/90">{seatingEyebrow(seating, busts.length)}</p>
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
          <div className="flex shrink-0 items-center gap-3">
            <SeatingChartPageClock
              durationMs={seatingOverlayDurationMs(seating, reducedMotion === true, busts.length)}
              cycleKey={seating.moves.length + seating.closedTableNums.length + busts.length}
              sizeClass="seating-chart-clock--table"
            />
            <div
              className={`venue-bust-overlay-wordmark hidden shrink-0 sm:block ${
                compact ? 'venue-bust-overlay-wordmark--compact' : ''
              }`}
              style={{ aspectRatio: '958 / 592' }}
            >
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </div>

        {rows.length > 0 ? (
          <div
            className={`venue-bust-overlay-grid ${compact ? 'venue-bust-overlay-grid--compact' : ''}`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {rows.map((row) => (
              <div
                key={row.key}
                className={seatingRowClass(row.closed, compact)}
              >
                <div className="venue-bust-overlay-row-line">
                  <span
                    className={`venue-seating-name venue-bust-overlay-name ${
                      compact ? 'venue-bust-overlay-name--compact' : ''
                    }`}
                  >
                    {row.label}
                  </span>
                  {row.marks.map((mark) => (
                    <span key={mark} className="venue-bust-overlay-byline shrink-0">
                      {mark}
                    </span>
                  ))}
                  <span className="venue-bust-overlay-table-well text-cyan-100/90">{row.detail}</span>
                </div>
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
