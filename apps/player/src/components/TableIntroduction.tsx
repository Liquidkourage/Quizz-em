import { useEffect, useState } from 'react'
import { ChipText } from '@qhe/ui'
import {
  introductionLine,
  introductionOrder,
  tableIntroduction,
  type IntroPlayer,
} from '../playerModel/tableIntroduction'

const FIRST_STEP_MS = 600
const NEXT_STEP_MS = 800

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useIntroCount(total: number, override: number | undefined): number {
  const reduced = prefersReducedMotion()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (override != null || reduced) return
    setCount(0)
  }, [total, override, reduced])
  useEffect(() => {
    if (override != null || reduced || count >= total) return
    const delay = count === 0 ? FIRST_STEP_MS : NEXT_STEP_MS
    const id = window.setTimeout(() => setCount((current) => Math.min(total, current + 1)), delay)
    return () => window.clearTimeout(id)
  }, [count, total, override, reduced])
  if (override != null) return override
  if (reduced) return total
  return count
}

/** The table, before the deal: the oval, then each player, and you last. */
export function TableIntroduction({
  players,
  heroId,
  tableId,
  smallBlind,
  bigBlind,
  revealedCount,
}: {
  players: readonly IntroPlayer[]
  heroId: string | undefined
  tableId: string
  smallBlind: number
  bigBlind: number
  revealedCount?: number
}) {
  const order = introductionOrder(tableIntroduction(players, heroId))
  const shown = useIntroCount(order.length, revealedCount)
  const done = order.length > 0 && shown >= order.length
  const latest = shown > 0 ? order[shown - 1] : undefined
  const visible = order.slice(0, shown)
  return (
    <section className="player-intro" aria-label="Players at your table">
      <div className="player-intro-stage">
        <div className="player-intro-felt">
          <p className="player-intro-table">Table {tableId}</p>
          <p className="player-intro-blinds">
            <ChipText text={`$${smallBlind}`} />
            <span className="player-intro-blinds-slash" aria-hidden>
              /
            </span>
            <ChipText text={`$${bigBlind}`} />
          </p>
        </div>
        {visible.map((plate) => (
          <div
            key={plate.id}
            className={`player-intro-plate${plate.isYou ? ' player-intro-plate--you' : ''} is-in`}
            style={{ left: `${plate.leftPct}%`, top: `${plate.topPct}%` }}
          >
            <p className="player-intro-seat">Seat {plate.seat}</p>
            <p className="player-intro-name">{plate.name}</p>
            {plate.isYou ? <p className="player-intro-you">You</p> : null}
            <p className="player-intro-stack">
              <ChipText text={`$${plate.stack}`} />
            </p>
          </div>
        ))}
      </div>
      <p className="player-intro-line" aria-live="polite">
        {introductionLine(order.length, done, latest)}
      </p>
    </section>
  )
}
