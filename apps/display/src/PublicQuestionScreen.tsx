import { QuizzEmWordmark } from '@qhe/ui'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import { DisplayFitQuestionText } from './DisplayFitQuestionText'

/** Largest the question may start before it shrinks to fit the screen. */
export const PUBLIC_QUESTION_MAX_FONT_VH = 0.2

export function PublicQuestionScreen({
  text,
  cueNumber = null,
  cueTotal = null,
}: {
  text: string
  cueNumber?: number | null
  cueTotal?: number | null
}) {
  const showCue =
    typeof cueNumber === 'number' &&
    Number.isFinite(cueNumber) &&
    typeof cueTotal === 'number' &&
    Number.isFinite(cueTotal) &&
    cueTotal > 0
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-[#050806] px-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]"
      role="region"
      aria-label="Question"
    >
      <DisplayWelcomeBackdrop />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="w-[clamp(8rem,16vw,13rem)] shrink-0" style={{ aspectRatio: '958 / 592' }}>
          <QuizzEmWordmark layout="fill" />
        </div>
        {showCue ? (
          <p className="shrink-0 text-[clamp(1.1rem,2.4vh,1.6rem)] font-black uppercase tracking-[0.14em] text-violet-100/90">
            Question {cueNumber} of {cueTotal}
          </p>
        ) : null}
        <DisplayFitQuestionText
          text={text}
          hostClassName="display-fit-question-host-fullscreen"
          maxFontVh={PUBLIC_QUESTION_MAX_FONT_VH}
          textClassName="venue-headline-question-slot text-balance text-center font-black leading-tight tracking-tight text-yellow-400 display-text-headline-question-spacious"
        />
      </div>
    </div>
  )
}
