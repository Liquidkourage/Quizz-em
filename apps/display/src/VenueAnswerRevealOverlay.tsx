import { motion, useReducedMotion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import type { VenueAnswerRevealPayload } from './useVenueAnswerReveal'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'

export type VenueAnswerRevealOverlayProps = {
  payload: VenueAnswerRevealPayload
}

export default function VenueAnswerRevealOverlay({ payload }: VenueAnswerRevealOverlayProps) {
  const reducedMotion = useReducedMotion()
  const { question, answer, answerRow } = payload

  return (
    <motion.div
      className="fixed inset-0 z-[205] flex items-center justify-center overflow-hidden bg-black/72 px-6 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Correct answer ${formatTriviaNumber(answer)}`}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <DisplayWelcomeBackdrop />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_42%,rgba(251,191,36,0.18),transparent_68%)]"
        aria-hidden
      />

      <motion.div
        className="relative z-10 flex w-full max-w-5xl flex-col rounded-2xl border border-amber-400/50 bg-gradient-to-b from-amber-950/90 via-[#120a04] to-black/92 px-6 py-8 shadow-[0_0_56px_rgba(251,191,36,0.22)] sm:px-10 sm:py-10"
        initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4 border-b border-amber-500/30 pb-4 sm:mb-6 sm:pb-5">
          <div className="min-w-0">
            <p className="font-orbitron text-[clamp(0.75rem,1.5vw,1rem)] font-bold uppercase tracking-[0.24em] text-amber-300/90">
              Time is up
            </p>
            <h2 className="mt-1 font-orbitron text-[clamp(1.5rem,3.2vw,2.35rem)] font-black uppercase leading-none tracking-[0.06em] text-amber-50">
              Correct answer
            </h2>
          </div>
          <div className="hidden w-[clamp(4rem,10vw,6.5rem)] shrink-0 sm:block">
            <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </div>

        <p className="line-clamp-3 overflow-hidden text-balance text-left font-semibold leading-snug tracking-tight text-yellow-300/95 display-text-headline-question-spacious">
          {question}
        </p>

        <div className="mt-6 flex flex-col items-center gap-4 sm:mt-8">
          {answerRow != null && answerRow.answerCards.length > 0 ? (
            <div className="scale-[1.35] sm:scale-[1.55] md:scale-[1.75]">
              <ShowdownFiveCardsUsed row={answerRow} size="lg" />
            </div>
          ) : (
            <p className="font-mono text-[clamp(2.75rem,8vmin,5.5rem)] font-black tabular-nums leading-none tracking-tight text-amber-100">
              {formatTriviaNumber(answer)}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
