import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { QuizzEmWordmark } from '@qhe/ui'
import type { ShowdownResultRow } from './showdownDisplay'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { DISPLAY_TEXT_HEADLINE_BADGE, DISPLAY_TEXT_HEADLINE_META } from './displayTypography'
import { VenueHeadlineMetaPart } from './VenueHeadlineMetaPart'
import {
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'

export type VenueFloorHeadlineProps = {
  skipMountIntro?: boolean
  logoWidthClass: string
  questionClass: string
  compactShell?: boolean
  showSetlistCue: boolean
  setlistCueNumber: number | null
  setlistCueTotal: number | null
  headlineDivergenceNote: string | null
  condenseProgress: VenueCondenseProgressModel | null
  headlinePhaseBadge: string | null
  showVenueBlindsHeadline: boolean
  venueBlindsHeadline: { amount: string; meta: string | null } | null
  headlineQuestionDisplay: string | null
  inVenueShowdown: boolean
  headlineAnswering: boolean
  inAnsweringCountdown: boolean
  venueShowdownAnswer: number | undefined
  venueShowdownAnswerRow: ShowdownResultRow | null
  timerSeconds: number | null
  othersStillWagering: boolean
}

function MetaSeparator() {
  return (
    <span className="venue-floor-headline-meta-sep" aria-hidden>
      |
    </span>
  )
}

export default function VenueFloorHeadline({
  skipMountIntro = false,
  logoWidthClass,
  questionClass,
  compactShell = false,
  showSetlistCue,
  setlistCueNumber,
  setlistCueTotal,
  headlineDivergenceNote,
  condenseProgress,
  headlinePhaseBadge,
  showVenueBlindsHeadline,
  venueBlindsHeadline,
  headlineQuestionDisplay,
  inVenueShowdown,
  headlineAnswering,
  inAnsweringCountdown,
  venueShowdownAnswer,
  venueShowdownAnswerRow,
  timerSeconds,
  othersStillWagering,
}: VenueFloorHeadlineProps) {
  const condenseParts = condenseProgress != null ? venueHeadlineCondenseCaptionParts(condenseProgress) : []
  const blindsMetaParts =
    showVenueBlindsHeadline && venueBlindsHeadline?.meta
      ? venueBlindsHeadline.meta.split(' · ').filter(Boolean)
      : []

  const hasMetaRow =
    showSetlistCue ||
    headlineDivergenceNote != null ||
    condenseParts.length > 0 ||
    (headlinePhaseBadge != null && !inVenueShowdown) ||
    (showVenueBlindsHeadline && venueBlindsHeadline != null)

  const showAside =
    (inVenueShowdown && venueShowdownAnswer != null) ||
    (headlineAnswering && !inVenueShowdown)

  return (
    <motion.header
      className={`venue-floor-headline sticky top-0 z-[45] shrink-0${
        compactShell ? ' venue-floor-headline--compact' : ''
      }`}
      style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top, 0px))' }}
      initial={skipMountIntro ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="venue-floor-headline-row">
        <div className={`venue-floor-headline-logo pointer-events-none shrink-0 ${logoWidthClass}`}>
          <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
        </div>

        <div className="venue-floor-headline-copy min-w-0 flex-1">
          {hasMetaRow ? (
            <p
              className="venue-floor-headline-meta"
              aria-label={[
                showSetlistCue && setlistCueNumber != null && setlistCueTotal != null
                  ? `Question ${setlistCueNumber} of ${setlistCueTotal}`
                  : null,
                headlinePhaseBadge,
                venueBlindsHeadline?.amount,
                ...(blindsMetaParts ?? []),
                condenseProgress != null ? venueHeadlineCondenseCaption(condenseProgress) : null,
                headlineDivergenceNote,
              ]
                .filter(Boolean)
                .join(', ')}
            >
              {showSetlistCue && setlistCueNumber != null && setlistCueTotal != null ? (
                <>
                  <span>
                    Question <span className="venue-floor-headline-meta-num">{setlistCueNumber}</span> of{' '}
                    {setlistCueTotal}
                  </span>
                </>
              ) : null}
              {headlinePhaseBadge != null && !inVenueShowdown ? (
                <>
                  {showSetlistCue ? <MetaSeparator /> : null}
                  <span>{headlinePhaseBadge}</span>
                </>
              ) : null}
              {showVenueBlindsHeadline && venueBlindsHeadline != null ? (
                <>
                  {showSetlistCue || (headlinePhaseBadge != null && !inVenueShowdown) ? (
                    <MetaSeparator />
                  ) : null}
                  <span className="venue-floor-headline-meta-num">{venueBlindsHeadline.amount}</span>
                  {blindsMetaParts.map((part) => (
                    <Fragment key={part}>
                      <MetaSeparator />
                      <span>{part}</span>
                    </Fragment>
                  ))}
                </>
              ) : null}
              {condenseParts.map((part, index) => {
                const needsSep =
                  showSetlistCue ||
                  (headlinePhaseBadge != null && !inVenueShowdown) ||
                  (showVenueBlindsHeadline && venueBlindsHeadline != null) ||
                  index > 0
                return (
                  <Fragment key={part}>
                    {needsSep ? <MetaSeparator /> : null}
                    <span className="whitespace-nowrap">
                      <VenueHeadlineMetaPart part={part} />
                    </span>
                  </Fragment>
                )
              })}
              {headlineDivergenceNote ? (
                <>
                  {(showSetlistCue ||
                    (headlinePhaseBadge != null && !inVenueShowdown) ||
                    (showVenueBlindsHeadline && venueBlindsHeadline != null) ||
                    condenseParts.length > 0) && <MetaSeparator />}
                  <span className="venue-floor-headline-meta-muted">{headlineDivergenceNote}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {headlineQuestionDisplay ? (
            <p
              className={`venue-floor-headline-question venue-headline-question-slot text-balance text-left tracking-tight text-yellow-400 ${questionClass}`}
            >
              {headlineQuestionDisplay}
            </p>
          ) : inVenueShowdown ? (
            <p className="sr-only">Showdown in progress.</p>
          ) : inAnsweringCountdown ? (
            <p className="venue-floor-headline-question text-left font-bold leading-snug tracking-tight text-cyan-200">
              Answer on your phone now
            </p>
          ) : (
            <p className="sr-only">Answering in progress.</p>
          )}
        </div>

        {showAside ? (
          <div className="venue-floor-headline-aside shrink-0">
            {inVenueShowdown && venueShowdownAnswer != null ? (
              <div
                className="venue-floor-headline-aside-card venue-floor-headline-aside-card--answer"
                aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
              >
                <span className={`font-semibold uppercase tracking-wide text-amber-200/70 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                  Correct answer
                </span>
                {venueShowdownAnswerRow != null && venueShowdownAnswerRow.answerCards.length > 0 ? (
                  <ShowdownFiveCardsUsed row={venueShowdownAnswerRow} size="sm" />
                ) : (
                  <div className="font-mono text-xl font-black tabular-nums tracking-tight text-amber-100 sm:text-2xl">
                    {formatTriviaNumber(venueShowdownAnswer)}
                  </div>
                )}
              </div>
            ) : headlineAnswering ? (
              <div
                className={`venue-floor-headline-aside-card ${
                  inAnsweringCountdown && typeof timerSeconds === 'number' && timerSeconds <= 10
                    ? 'venue-floor-headline-aside-card--urgent'
                    : 'venue-floor-headline-aside-card--answer'
                }`}
                aria-live="polite"
                aria-label={
                  inAnsweringCountdown && typeof timerSeconds === 'number'
                    ? `Answer on your phone, ${timerSeconds} seconds remaining`
                    : 'Answer on your phone — timer starts when every table finishes wagering'
                }
              >
                <span className={`text-center font-black uppercase tracking-wide text-cyan-100/90 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                  Answer on your phone
                </span>
                {inAnsweringCountdown && typeof timerSeconds === 'number' ? (
                  <div className="text-center font-mono text-xl font-black tabular-nums tracking-tight text-cyan-100 sm:text-2xl">
                    {timerSeconds}s
                  </div>
                ) : othersStillWagering ? (
                  <div className={`text-center font-semibold text-cyan-200/80 ${DISPLAY_TEXT_HEADLINE_META}`}>
                    Waiting for last table
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.header>
  )
}
