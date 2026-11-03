import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
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

/** Keep a group to one row, then two, so a long update stays on the TV. */
function seatingColumns(count: number): number {
  if (count <= 1) return 1
  if (count <= 5) return count
  if (count <= 10) return 5
  return 6
}

function useSeatingCardFit(
  frameRef: RefObject<HTMLElement | null>,
  cardRef: RefObject<HTMLElement | null>,
  layoutKey: string,
) {
  useLayoutEffect(() => {
    const frame = frameRef.current
    const card = cardRef.current
    if (!frame || !card) return
    const fit = () => {
      card.style.zoom = '1'
      const needed = card.offsetHeight
      const available = frame.clientHeight
      if (needed <= 0 || available <= 0) return
      const next = needed > available ? Math.max(0.42, available / needed) : 1
      const zoom = next < 0.995 ? String(Math.round(next * 1000) / 1000) : ''
      if (card.style.zoom !== zoom) card.style.zoom = zoom
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frame)
    const fonts = document.fonts
    void fonts?.ready.then(fit)
    return () => {
      observer.disconnect()
      card.style.zoom = ''
    }
  }, [cardRef, frameRef, layoutKey])
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

function seatingRowClass(kind: 'move' | 'eliminated' | 'closed', compact: boolean): string {
  const parts = ['venue-bust-overlay-row', `venue-bust-overlay-row--${kind}`]
  if (compact) parts.push('venue-bust-overlay-row--compact')
  return parts.join(' ')
}

type SeatingUpdateRow = {
  key: string
  label: string
  detail: string
  marks: string[]
  kind: 'move' | 'eliminated' | 'closed'
}

type SeatingClosureBlock = {
  header: SeatingUpdateRow
  moves: SeatingUpdateRow[]
}

type SeatingUpdateLayout = {
  eliminations: SeatingUpdateRow[]
  closures: SeatingClosureBlock[]
  otherMoves: SeatingUpdateRow[]
}

export function seatingMoveDetail(move: {
  fromTableNum: number
  toTableNum: number
  renumberedFromTableNum?: number
}): string {
  const from = move.fromTableNum
  const to = move.toTableNum
  const prior = move.renumberedFromTableNum
  if (prior != null && prior !== to) {
    return `Table ${from} → Table ${to} · was table ${prior} before tables were renumbered`
  }
  if (from === to) return `Table ${from} → Table ${to} · tables were renumbered`
  return `Table ${from} → Table ${to}`
}

function playerMoveRow(
  move: DisplayVenueSeatingAnnouncement['moves'][number],
  busts: DisplayVenueBustEntry[],
  usedBust: Set<number>,
): SeatingUpdateRow {
  const bustAt = busts.findIndex((bust, index) => !usedBust.has(index) && samePlayer(bust.name, move.name))
  if (bustAt >= 0) usedBust.add(bustAt)
  const byline = move.byline?.trim() ?? ''
  return {
    key: `${move.name}-${move.fromTableNum}-${move.toTableNum}`,
    label: displayPlayerName(move.name),
    detail: seatingMoveDetail(move),
    marks: rowMarks(bustAt >= 0, byline),
    kind: bustAt >= 0 ? 'eliminated' : 'move',
  }
}

function unpairedBustRow(bust: DisplayVenueBustEntry): SeatingUpdateRow {
  return {
    key: `out-${bust.name}-${bust.tableNum}`,
    label: displayPlayerName(bust.name),
    detail: `Table ${bust.tableNum}`,
    marks: ['ELIMINATED'],
    kind: 'eliminated',
  }
}

function closedHeaderRow(seating: DisplayVenueSeatingAnnouncement, tableNum: number): SeatingUpdateRow {
  return {
    key: `closed-${tableNum}`,
    label: `Table ${tableNum}`,
    detail: 'Closed',
    marks: rowMarks(false, droppedTableByline(seating, tableNum)),
    kind: 'closed',
  }
}

/** Eliminations, then each closed table with the people who left it, then other moves. */
export function seatingUpdateLayout(
  seating: DisplayVenueSeatingAnnouncement,
  busts: DisplayVenueBustEntry[],
): SeatingUpdateLayout {
  const usedBust = new Set<number>()
  const moved = seating.moves.map((move) => ({
    fromTableNum: move.fromTableNum,
    row: playerMoveRow(move, busts, usedBust),
  }))
  const closed = new Set(seating.closedTableNums)
  return {
    eliminations: [
      ...moved.filter((item) => item.row.kind === 'eliminated').map((item) => item.row),
      ...busts.filter((_, index) => !usedBust.has(index)).map(unpairedBustRow),
    ],
    closures: seating.closedTableNums.map((tableNum) => ({
      header: closedHeaderRow(seating, tableNum),
      moves: moved
        .filter((item) => item.row.kind === 'move' && item.fromTableNum === tableNum)
        .map((item) => item.row),
    })),
    otherMoves: moved
      .filter((item) => item.row.kind === 'move' && !closed.has(item.fromTableNum))
      .map((item) => item.row),
  }
}

function seatingLayoutRowCount(layout: SeatingUpdateLayout): number {
  const nested = layout.closures.reduce((sum, block) => sum + 1 + block.moves.length, 0)
  return layout.eliminations.length + layout.otherMoves.length + nested
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

function SeatingUpdateRow({ row, compact }: { row: SeatingUpdateRow; compact: boolean }) {
  return (
    <div className={seatingRowClass(row.kind, compact)}>
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
        <span className="venue-bust-overlay-table-well">{row.detail}</span>
      </div>
    </div>
  )
}

function SeatingUpdateGrid({ rows, compact }: { rows: SeatingUpdateRow[]; compact: boolean }) {
  const columns = seatingColumns(rows.length)
  return (
    <div
      className={`venue-bust-overlay-grid ${compact ? 'venue-bust-overlay-grid--compact' : ''}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {rows.map((row) => (
        <SeatingUpdateRow key={row.key} row={row} compact={compact} />
      ))}
    </div>
  )
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

  const layout = useMemo(() => seatingUpdateLayout(seating, busts), [busts, seating])
  const rowCount = seatingLayoutRowCount(layout)
  const compact = rowCount > 10
  const fill = rowCount > 8 || layout.closures.length > 1
  const frameRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  useSeatingCardFit(frameRef, cardRef, `${rowCount}:${layout.closures.length}`)

  return (
    <motion.div
      ref={frameRef}
      className="fixed inset-0 z-[195] flex items-center justify-center overflow-hidden bg-black/78 p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={false}
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
        ref={cardRef}
        className={`venue-seating-move venue-seating-update venue-bust-overlay-panel relative z-10 flex min-h-0 max-h-full w-fit min-w-[min(32rem,92vw)] max-w-[min(72rem,92vw)] flex-col overflow-hidden border-cyan-400/45 shadow-[0_0_28px_rgba(34,211,238,0.18)] ${
          compact ? 'venue-bust-overlay-panel--compact' : ''
        } ${fill ? 'venue-seating-update--fill' : ''}`}
        initial={false}
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

        {rowCount > 0 ? (
          <div className="venue-seating-sections">
            {layout.eliminations.length > 0 ? (
              <div className="venue-seating-closure">
                <SeatingUpdateRow
                  row={{
                    key: 'eliminated-header',
                    label: 'Eliminated',
                    detail: 'OUT',
                    marks: [],
                    kind: 'eliminated',
                  }}
                  compact={compact}
                />
                <div className="venue-seating-closure-moves">
                  <SeatingUpdateGrid
                    rows={layout.eliminations.map((row) => ({
                      ...row,
                      marks: row.marks.filter((mark) => mark !== 'ELIMINATED'),
                    }))}
                    compact={compact}
                  />
                </div>
              </div>
            ) : null}
            {layout.closures.length > 0 ? (
              <div className="venue-seating-closures">
                {layout.closures.map((block) => (
                  <div key={block.header.key} className="venue-seating-closure">
                    <SeatingUpdateRow row={block.header} compact={compact} />
                    {block.moves.length > 0 ? (
                      <div className="venue-seating-closure-moves">
                        <SeatingUpdateGrid rows={block.moves} compact={compact} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {layout.otherMoves.length > 0 ? (
              <SeatingUpdateGrid rows={layout.otherMoves} compact={compact} />
            ) : null}
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
