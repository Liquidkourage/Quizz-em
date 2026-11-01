import { motion, useReducedMotion } from 'framer-motion'
import { hostVenueAutoAlertTone, type HostVenueAutoAlert } from './hostVenueAutoAlerts'

const TONE_CLASS: Record<ReturnType<typeof hostVenueAutoAlertTone>, string> = {
  emerald:
    'border-emerald-400/50 bg-gradient-to-b from-emerald-950/95 to-black/90 shadow-[0_0_32px_rgba(52,211,153,0.22)]',
  purple:
    'border-purple-400/50 bg-gradient-to-b from-purple-950/95 to-black/90 shadow-[0_0_32px_rgba(168,85,247,0.22)]',
  amber:
    'border-amber-400/50 bg-gradient-to-b from-amber-950/95 to-black/90 shadow-[0_0_32px_rgba(251,191,36,0.22)]',
  cyan: 'border-cyan-400/50 bg-gradient-to-b from-cyan-950/95 to-black/90 shadow-[0_0_32px_rgba(34,211,238,0.18)]',
}

const LABEL_CLASS: Record<ReturnType<typeof hostVenueAutoAlertTone>, string> = {
  emerald: 'text-emerald-300/90',
  purple: 'text-purple-300/90',
  amber: 'text-amber-300/90',
  cyan: 'text-cyan-300/90',
}

export default function HostVenueAutoAlertBanner({ alert }: { alert: HostVenueAutoAlert }) {
  const reducedMotion = useReducedMotion()
  const tone = hostVenueAutoAlertTone(alert.kind)

  return (
    <motion.div
      className="pointer-events-none fixed left-1/2 top-4 z-[70] w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2"
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
    >
      <div className={`rounded-xl border px-4 py-2.5 backdrop-blur-md ${TONE_CLASS[tone]}`}>
        <p className={`text-[0.65rem] font-bold uppercase tracking-[0.16em] ${LABEL_CLASS[tone]}`}>
          Update
        </p>
        <p className="text-base font-bold leading-snug text-white">{alert.title}</p>
        {alert.detail ? <p className="mt-0.5 text-xs leading-snug text-white/70">{alert.detail}</p> : null}
      </div>
    </motion.div>
  )
}
