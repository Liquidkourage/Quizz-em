import { useEffect, useRef, useState } from 'react'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import {
  detectVenueAutoAlerts,
  snapshotVenueFeltBeat,
  type HostVenueAutoAlert,
} from './hostVenueAutoAlerts'

const AUTO_ALERT_DWELL_MS = 7500

export function useHostVenueAutoAlerts(
  felts: HostVenueFeltBeatRow[] | null,
): HostVenueAutoAlert | null {
  const prevSnapshotRef = useRef<ReturnType<typeof snapshotVenueFeltBeat> | null>(null)
  const [alert, setAlert] = useState<HostVenueAutoAlert | null>(null)

  useEffect(() => {
    if (felts == null) return
    const next = snapshotVenueFeltBeat(felts)
    const alerts = detectVenueAutoAlerts(prevSnapshotRef.current, next)
    prevSnapshotRef.current = next
    if (alerts.length > 0) {
      setAlert(alerts[alerts.length - 1]!)
    }
  }, [felts])

  useEffect(() => {
    if (alert == null) return
    const timer = window.setTimeout(() => setAlert(null), AUTO_ALERT_DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [alert])

  return alert
}
