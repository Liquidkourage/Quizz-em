import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { CardFaceGraphic, QuizzEmWordmark } from '@qhe/ui'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import {
  HOW_TO_PLAY_SEGMENTS,
  howToPlayFrame,
  howToPlayJoinUrl,
  howToPlayQrSrc,
  type HowToPlayCardFace,
  type HowToPlayFrame,
} from './howToPlayTutorial'

export type VenueSeatingRulesWallProps = {
  venueCode?: string
  /** When set, the host owns this beat. The TV shows it and does not advance on its own. */
  step?: number
  paused?: boolean
}

function usePlayingStep(controlled: number | undefined): number {
  const [live, setLive] = useState(0)
  const step = controlled ?? live
  useEffect(() => {
    if (controlled != null) return undefined
    const ms = howToPlayFrame(step).durationMs
    const id = window.setTimeout(() => {
      setLive((current) => howToPlayFrame(current + 1).stepIndex)
    }, ms)
    return () => window.clearTimeout(id)
  }, [controlled, step])
  return step
}

function joinOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function TutorialTimeline({ segment }: { segment: number }) {
  return (
    <ol className="htp-timeline" aria-label="Lesson">
      {HOW_TO_PLAY_SEGMENTS.map((label, index) => {
        const state = index === segment ? 'current' : index < segment ? 'done' : 'upcoming'
        return (
          <li key={label} className={`htp-dot htp-dot--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function TutorialDigit({
  digit,
  face,
  size,
}: {
  digit: number
  face: HowToPlayCardFace
  size: 'board' | 'hole' | 'answer'
}) {
  if (face === 'hidden') {
    return <div className={`htp-card htp-card--${size} htp-card--ghost`} aria-hidden />
  }
  return (
    <div className={`htp-card htp-card--${size} htp-card--${face}`}>
      <CardFaceGraphic digit={digit} dimmed={face === 'dimmed'} alt="" />
    </div>
  )
}

function AnswerRow({ frame }: { frame: HowToPlayFrame }) {
  const face: HowToPlayCardFace = frame.answerRevealed ? 'selected' : 'hidden'
  return (
    <div className="htp-card-row htp-card-row--answer">
      {frame.answerDigits.map((digit, index) => (
        <span key={`${digit}-${index}`} className="htp-answer-piece">
          {index === frame.decimalBefore ? (
            <span className={frame.answerRevealed ? 'htp-decimal htp-decimal--on' : 'htp-decimal'} aria-hidden>
              .
            </span>
          ) : null}
          <TutorialDigit digit={digit} face={face} size="answer" />
        </span>
      ))}
    </div>
  )
}

function PotRow({ pots }: { pots: HowToPlayFrame['pots'] }) {
  if (pots.length === 0) return null
  return (
    <div className="htp-pots" aria-label="Pots">
      {pots.map((pot) => (
        <div key={pot.label} className={pot.label === 'Side pot' ? 'htp-pot htp-pot--side' : 'htp-pot'}>
          <p className="htp-kicker">{pot.label}</p>
          <p className="htp-pot-amt">{pot.amount}</p>
        </div>
      ))}
    </div>
  )
}

function TutorialFelt({ frame }: { frame: HowToPlayFrame }) {
  return (
    <div className="htp-felt">
      <div className="htp-question">
        <p className="htp-kicker">Example trivia question</p>
        <h2>{frame.question}</h2>
      </div>
      <div className="htp-board">
        <p className="htp-kicker">Five community cards, shared by the table</p>
        <div className="htp-card-row">
          {frame.boardDigits.map((digit, index) => (
            <TutorialDigit key={`${digit}-${index}`} digit={digit} face={frame.boardFaces[index] ?? 'hidden'} size="board" />
          ))}
        </div>
      </div>
      <div className="htp-player">
        <div className="htp-holes">
          <p className="htp-kicker">Your two cards</p>
          <div className="htp-card-row">
            {frame.holeDigits.map((digit, index) => (
              <TutorialDigit key={`${digit}-${index}`} digit={digit} face={frame.holeFaces[index] ?? 'hidden'} size="hole" />
            ))}
          </div>
        </div>
        <div className={frame.answerRevealed ? 'htp-answer htp-answer--on' : 'htp-answer'}>
          <p className="htp-kicker">The number you submit</p>
          <AnswerRow frame={frame} />
        </div>
      </div>
      <PotRow pots={frame.pots} />
      {frame.showCallout ? (
        <div className="htp-callout" role="status">
          <p className="htp-kicker">Your decision</p>
          <p className="htp-callout-line">{frame.callout}</p>
        </div>
      ) : null}
      {frame.showOutcome ? (
        <div className="htp-outcome" role="status">
          <p className="htp-kicker">The answer is revealed</p>
          <div className="htp-scores">
            <div className="htp-score htp-score--win">
              <p className="htp-kicker">Your answer</p>
              <p className="htp-score-num">{frame.submittedAnswer}</p>
            </div>
            <p className="htp-versus">vs.</p>
            <div className="htp-score">
              <p className="htp-kicker">Correct answer</p>
              <p className="htp-score-num">{frame.correctAnswer}</p>
            </div>
          </div>
          <p className="htp-outcome-detail">{frame.outcomeDetail}</p>
        </div>
      ) : null}
    </div>
  )
}

function TutorialGuide({ frame }: { frame: HowToPlayFrame }) {
  return (
    <aside className="htp-guide" aria-live="polite">
      <p className="htp-kicker">{frame.eyebrow}</p>
      <h2>{frame.title}</h2>
      <p className="htp-guide-copy">{frame.description}</p>
      <p className="htp-hint">{frame.hint}</p>
      <p className="htp-step">{frame.stepLabel}</p>
    </aside>
  )
}

function TutorialJoin({ venueCode }: { venueCode: string }) {
  const url = howToPlayJoinUrl(joinOrigin(), venueCode)
  const qr = howToPlayQrSrc(url)
  const code = venueCode.trim().toUpperCase()
  return (
    <div className="htp-join">
      {qr ? <img className="htp-qr" src={qr} alt="" /> : <div className="htp-qr htp-qr--empty" aria-hidden />}
      <div>
        <p className="htp-join-title">Join on your phone</p>
        <p className="htp-join-note">
          {code ? `Room ${code}. ` : ''}
          Bet and submit your answer there.
        </p>
      </div>
    </div>
  )
}

export default function VenueSeatingRulesWall({ venueCode = '', step, paused = false }: VenueSeatingRulesWallProps) {
  const shown = usePlayingStep(step)
  const frame = howToPlayFrame(shown)
  const reduce = useReducedMotion() === true
  return (
    <div
      className={reduce ? 'htp-screen htp-screen--still' : 'htp-screen'}
      role="region"
      aria-label="How to play"
    >
      <DisplayWelcomeBackdrop />
      <header className="htp-header">
        <div className="htp-brand">
          <div className="htp-logo">
            <QuizzEmWordmark layout="fill" />
          </div>
          <div>
            <h1>How to play</h1>
            <p>Trivia meets Texas Hold&apos;em</p>
          </div>
        </div>
        <TutorialTimeline segment={frame.segment} />
      </header>
      <div className="htp-main">
        <TutorialFelt frame={frame} />
        <TutorialGuide frame={frame} />
      </div>
      <footer className="htp-footer">
        <TutorialJoin venueCode={venueCode} />
        <div className="htp-progress" aria-hidden>
          <div
            key={frame.stepIndex}
            className="htp-progress-fill"
            style={{ animationDuration: `${frame.durationMs}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          />
        </div>
      </footer>
    </div>
  )
}
