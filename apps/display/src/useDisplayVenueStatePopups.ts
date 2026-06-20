import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { buildVenueWallTileRows } from './venueWallModel'
import {
  collapseRedundantVenuePopups,
  detectDisplayVenueStatePopups,
  DISPLAY_STATE_POPUP_DWELL_MS,
  DISPLAY_STATE_POPUP_DWELL_REDUCED_MS,
  snapshotDisplayVenueBeat,
  type DisplayVenueBeat,
  type DisplayVenueStatePopup,
} from './displayVenueStatePopups'

export type DisplayVenueStatePopupState = {
  visible: boolean
  popup: DisplayVenueStatePopup | null
}

export function useDisplayVenueStatePopups(
  wall: DisplayVenueWallSnapshot | null,
): DisplayVenueStatePopupState {
  const prevBeatRef = useRef<DisplayVenueBeat | null>(null)
  const [visible, setVisible] = useState(false)
  const [popup, setPopup] = useState<DisplayVenueStatePopup | null>(null)
  const queueRef = useRef<DisplayVenueStatePopup[]>([])
  const drainingRef = useRef(false)

  useEffect(() => {
    if (wall == null) {
      prevBeatRef.current = null
      return
    }

    const tiles = buildVenueWallTileRows(wall)
    const nextBeat = snapshotDisplayVenueBeat(wall, tiles)
    const prevBeat = prevBeatRef.current
    prevBeatRef.current = nextBeat

    if (prevBeat == null) return

    const detected = detectDisplayVenueStatePopups(prevBeat, nextBeat)
    if (detected.length === 0) return

    if (detected.some((p) => p.kind === 'board-dealt')) {
      queueRef.current = queueRef.current.filter((p) => p.kind !== 'round1-complete')
    }
    if (detected.some((p) => p.kind === 'answer-window-start')) {
      queueRef.current = queueRef.current.filter((p) => p.kind !== 'round2-complete')
    }
    queueRef.current.push(...detected)
    queueRef.current = collapseRedundantVenuePopups(queueRef.current)

    const drain = () => {
      if (drainingRef.current) return
      const next = queueRef.current.shift()
      if (!next) return

      drainingRef.current = true
      setPopup(next)
      setVisible(true)

      const reducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const dwell = reducedMotion ? DISPLAY_STATE_POPUP_DWELL_REDUCED_MS : DISPLAY_STATE_POPUP_DWELL_MS

      window.setTimeout(() => {
        setVisible(false)
        window.setTimeout(() => {
          drainingRef.current = false
          if (queueRef.current.length > 0) drain()
        }, reducedMotion ? 0 : 280)
      }, dwell)
    }

    drain()
  }, [wall])

  return { visible, popup }
}
