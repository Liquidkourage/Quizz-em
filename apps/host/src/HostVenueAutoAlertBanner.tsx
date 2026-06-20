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
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center px-4 pt-4 sm:pt-5"
      role="status"
      aria-live="assertive"
      initial={reducedMotion ? false : { opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -16 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border px-5 py-4 backdrop-blur-md sm:px-6 sm:py-5 ${TONE_CLASS[tone]}`}
      >
        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${LABEL_CLASS[tone]}`}>
          Venue auto-update
        </p>
        <p className="mt-1 text-xl font-bold leading-snug text-white sm:text-2xl">{alert.title}</p>
        {alert.detail ? (
          <p className="mt-2 text-sm leading-snug text-white/72 sm:text-base">{alert.detail}</p>
        ) : null}
      </div>
    </motion.div>
  )
}
