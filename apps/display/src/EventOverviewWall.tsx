import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  EVENT_OVERVIEW_SEAT_SLOTS,
  eventOverviewFrame,
  eventSeatFace,
  type EventSeatKind,
} from './eventOverviewTutorial'
import { howToPlayJoinUrl, howToPlayQrSrc } from './howToPlayTutorial'
import './eventOverview.css'

export type EventOverviewWallProps = {
  venueCode?: string
  /** When set, the host owns this beat. The TV shows it and does not advance on its own. */
  step?: number
}

function joinOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function useStageScale(): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

function usePlayingStep(controlled: number | undefined): number {
  const [live, setLive] = useState(0)
  const step = controlled ?? live
  useEffect(() => {
    if (controlled != null) return undefined
    const id = window.setTimeout(() => {
      setLive((current) => eventOverviewFrame(current + 1).stepIndex)
    }, eventOverviewFrame(step).durationMs)
    return () => window.clearTimeout(id)
  }, [controlled, step])
  return step
}

function SeatMark({ table, seat, step }: { table: number; seat: number; step: number }) {
  const face = eventSeatFace(table, seat, step)
  const [left, top] = EVENT_OVERVIEW_SEAT_SLOTS[seat] ?? [50, 50]
  const kind: EventSeatKind = face.kind
  return (
    <div
      className={kind === 'plain' ? 'evt-seat' : `evt-seat evt-seat--${kind}`}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <div className="evt-avatar">{face.label}</div>
      <div className="evt-stack">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}

function PokerTable({
  which,
  name,
  empty,
  step,
}: {
  which: 'one' | 'two' | 'three'
  name: string
  empty: boolean
  step: number
}) {
  const table = which === 'one' ? 0 : which === 'two' ? 1 : 2
  return (
    <div className={`evt-table evt-table--${which}${empty ? ' evt-table--empty' : ''}`}>
      <div className="evt-felt">
        <div className="evt-table-name">{name}</div>
        <div className="evt-pot">
          <i />
          <i />
          <i />
          POT
        </div>
      </div>
      {EVENT_OVERVIEW_SEAT_SLOTS.map((_, seat) => (
        <SeatMark key={seat} table={table} seat={seat} step={step} />
      ))}
    </div>
  )
}

export default function EventOverviewWall({ venueCode = '', step: controlled }: EventOverviewWallProps) {
  const step = usePlayingStep(controlled)
  const frame = eventOverviewFrame(step)
  const reduce = useReducedMotion() === true
  const scale = useStageScale()
  const url = howToPlayJoinUrl(joinOrigin(), venueCode)
  const qr = howToPlayQrSrc(url)
  const code = venueCode.trim().toUpperCase()

  return (
    <div className="evt-viewport">
      <div
        className={reduce ? 'evt-screen evt-screen--still' : 'evt-screen'}
        data-step={frame.stepIndex}
        role="region"
        aria-label="How the event works"
        style={{ ['--evt-scale' as string]: String(scale) }}
      >
        <div className="evt-arc evt-arc--left" />
        <div className="evt-arc evt-arc--right" />
        <div className="evt-suit evt-suit--left">♣</div>
        <div className="evt-suit evt-suit--right">♠</div>
        <header className="evt-header">
          <div className="evt-brand">
            <div className="evt-logo">QUIZZ’EM</div>
            <div className="evt-brand-title">
              <h1>How the Event Works</h1>
              <p>The poker tournament and the all-player accuracy leaderboard</p>
            </div>
          </div>
        </header>
        <main className="evt-main">
          <section className="evt-stage" aria-label="Animated tournament tables">
            <div className="evt-stage-label">Poker tables</div>
            <div className="evt-stage-sub">Illustrative players and standings</div>
            <div className="evt-field">
              <PokerTable which="one" name="TABLE 1" empty={frame.emptyTables[0] === true} step={frame.stepIndex} />
              <PokerTable which="two" name="TABLE 2" empty={frame.emptyTables[1] === true} step={frame.stepIndex} />
              <PokerTable which="three" name={frame.tableName} empty={false} step={frame.stepIndex} />
            </div>
            <div className="evt-winner">TOURNAMENT WINNER</div>
            <div className="evt-tally">
              <div className="evt-stat">
                <strong>{frame.remaining}</strong>
                <span>{frame.remainingWord}</span>
              </div>
              <div className="evt-stat evt-stat--accuracy">
                <strong>{frame.accuracy}</strong>
                <span>playing for accuracy</span>
              </div>
              <div className="evt-stat">
                <strong>{frame.tables}</strong>
                <span>{frame.tablesWord}</span>
              </div>
            </div>
          </section>
          <aside className="evt-guide" aria-live="polite">
            <div className="evt-eyebrow">{frame.label}</div>
            <h2>{frame.title}</h2>
            <p>{frame.body}</p>
            <section className="evt-board" aria-label="Example all-player accuracy leaderboard">
              <div className="evt-board-head">
                <span>ALL-PLAYER ACCURACY LEADERBOARD</span>
                <small>Illustrative rankings</small>
              </div>
              {frame.ranks.map((row, index) => (
                <div key={row.name} className="evt-rank">
                  <b>{index + 1}</b>
                  <span>{row.name}</span>
                  <em className={row.special ? 'evt-rank--special' : undefined}>{row.status}</em>
                </div>
              ))}
            </section>
            <div className="evt-note">{frame.note}</div>
            <div className="evt-count">
              <span>{frame.stepLabel}</span>
              <span>Animated event overview</span>
            </div>
          </aside>
        </main>
        <footer className="evt-footer">
          <div className="evt-join">
            {qr ? <img className="evt-qr" src={qr} alt="QR code to join" /> : <div className="evt-qr" aria-hidden />}
            <div>
              <strong>Join and answer on your phone</strong>
              <span>
                {code ? `Room ${code}. ` : ''}
                Scan to join the event on your phone.
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
