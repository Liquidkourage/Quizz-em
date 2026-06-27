import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueBustEntry } from '@qhe/net'
import { computeVenueBustGridLayout } from './venueBustGridLayout'
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

export type VenueBustAnnouncementProps = {
  busts: DisplayVenueBustEntry[]
}

export default function VenueBustAnnouncement({ busts }: VenueBustAnnouncementProps) {
  const reducedMotion = useReducedMotion()
  const title = busts.length === 1 ? 'Player eliminated' : 'Players eliminated'
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1920, h: 1080 },
  )

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const grid = useMemo(
    () => computeVenueBustGridLayout(busts.length, viewport.w, viewport.h),
    [busts.length, viewport.w, viewport.h],
  )

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/78 px-6 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <DisplayWelcomeBackdrop />
      <div className="venue-bust-overlay-glow pointer-events-none absolute inset-0" aria-hidden />

      <motion.div
        className={`venue-bust-overlay-panel relative z-10 flex w-full flex-col ${
          grid.compact ? 'venue-bust-overlay-panel--compact' : ''
        }`}
        style={{ maxWidth: grid.cardMaxWidth }}
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`venue-bust-overlay-header ${
            grid.compact ? 'venue-bust-overlay-header--compact' : ''
          }`}
        >
          <div className="min-w-0">
            <p className="venue-bust-overlay-eyebrow">
              {title} · {busts.length}
            </p>
            <h2
              className={`venue-bust-overlay-title ${
                grid.compact ? 'venue-bust-overlay-title--compact' : ''
              }`}
            >
              Out of the tournament
            </h2>
          </div>
          <div
            className={`venue-bust-overlay-wordmark hidden shrink-0 sm:block ${
              grid.compact ? 'venue-bust-overlay-wordmark--compact' : ''
            }`}
          >
            <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </div>

        <ul
          className={`venue-bust-overlay-grid ${grid.compact ? 'venue-bust-overlay-grid--compact' : ''}`}
          style={{ gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` }}
        >
          {busts.map((b, index) => (
            <motion.li
              key={`${b.name}-${b.tableNum}-${index}`}
              className={`venue-bust-overlay-row ${
                grid.compact ? 'venue-bust-overlay-row--compact' : ''
              }`}
              initial={reducedMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.32,
                delay: reducedMotion ? 0 : 0.08 + index * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span
                className={`venue-bust-overlay-name ${
                  grid.compact ? 'venue-bust-overlay-name--compact' : ''
                }`}
              >
                {displayPlayerName(b.name)}
              </span>
              <span className="venue-bust-overlay-table-well">Table {b.tableNum}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}
