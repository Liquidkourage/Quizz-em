import { motion, useReducedMotion } from 'framer-motion'
import {
  displayVenueStatePopupTone,
  type DisplayVenueStatePopup,
} from './displayVenueStatePopups'

const TONE_CLASS = {
  emerald:
    'border-emerald-400/55 bg-gradient-to-b from-emerald-950/92 to-black/88 shadow-[0_0_28px_rgba(52,211,153,0.2)]',
  purple:
    'border-purple-400/55 bg-gradient-to-b from-purple-950/92 to-black/88 shadow-[0_0_28px_rgba(168,85,247,0.2)]',
  amber:
    'border-amber-400/55 bg-gradient-to-b from-amber-950/92 to-black/88 shadow-[0_0_28px_rgba(251,191,36,0.2)]',
  blue: 'border-cyan-400/55 bg-gradient-to-b from-cyan-950/92 to-black/88 shadow-[0_0_28px_rgba(34,211,238,0.18)]',
} as const

const LABEL_CLASS = {
  emerald: 'text-emerald-300/90',
  purple: 'text-purple-300/90',
  amber: 'text-amber-300/90',
  blue: 'text-cyan-300/90',
} as const

export default function DisplayVenueStatePopup({ popup }: { popup: DisplayVenueStatePopup }) {
  const reducedMotion = useReducedMotion()
  const tone = displayVenueStatePopupTone(popup.kind)

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[150] flex justify-center px-4 sm:bottom-8"
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: 18 }}
      transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border px-5 py-4 backdrop-blur-md sm:max-w-2xl sm:px-6 sm:py-4 ${TONE_CLASS[tone]}`}
      >
        <p className={`text-[10px] font-bold uppercase tracking-[0.22em] sm:text-[11px] ${LABEL_CLASS[tone]}`}>
          Venue update
        </p>
        <p className="mt-1 font-orbitron text-[clamp(1.15rem,2.4vw,1.65rem)] font-black uppercase leading-snug tracking-wide text-white">
          {popup.title}
        </p>
        {popup.detail ? (
          <p className="mt-1.5 text-sm leading-snug text-white/75 sm:text-base">{popup.detail}</p>
        ) : null}
      </div>
    </motion.div>
  )
}
