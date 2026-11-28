import { useEffect, useState } from 'react'
import type { BlindChangeNotice } from '@qhe/net'
import feltUrl from './assets/blinds/felt.png'
import railUrl from './assets/blinds/rail.png'
import smallStackUrl from './assets/blinds/small-stack.png'
import bigStackUrl from './assets/blinds/big-stack.png'

export const BLIND_CHANGE_MS = 4600

const SEEN_BLIND_KEY = 'qhe-blind-seen'

export function blindChangeFromPayload(raw: unknown): BlindChangeNotice | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as {
    smallBlind?: unknown
    bigBlind?: unknown
    atMs?: unknown
    previousSmallBlind?: unknown
    previousBigBlind?: unknown
  }
  const smallBlind = wholeBlind(row.smallBlind)
  const bigBlind = wholeBlind(row.bigBlind)
  const atMs = typeof row.atMs === 'number' && Number.isFinite(row.atMs) ? row.atMs : null
  if (smallBlind == null || bigBlind == null || atMs == null || atMs < 1) return null
  const previousSmallBlind = wholeBlind(row.previousSmallBlind)
  const previousBigBlind = wholeBlind(row.previousBigBlind)
  return {
    smallBlind,
    bigBlind,
    atMs,
    ...(previousSmallBlind != null && previousBigBlind != null ? { previousSmallBlind, previousBigBlind } : {}),
  }
}

function wholeBlind(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null
  return Math.floor(value)
}

function previousPair(notice: BlindChangeNotice): { smallBlind: number; bigBlind: number } | null {
  const smallBlind = notice.previousSmallBlind
  const bigBlind = notice.previousBigBlind
  if (smallBlind == null || bigBlind == null) return null
  if (smallBlind === notice.smallBlind && bigBlind === notice.bigBlind) return null
  if (smallBlind > notice.smallBlind || bigBlind > notice.bigBlind) return null
  return { smallBlind, bigBlind }
}

/** The question stays off the TV until this blinds announcement has had the screen. */
export function questionYieldsToBlinds(
  questionOnScreen: boolean,
  blindsAtMs: number | null,
  blindsFinishedAtMs: number | null,
): boolean {
  return questionOnScreen && blindsAtMs != null && blindsFinishedAtMs !== blindsAtMs
}

/** Development replay: `?blindPreview=100,200,200,400` is old small, old big, new small, new big. */
type BlindPhase = 'hold' | 'flip' | 'rise' | 'sweep' | 'confirm'

/** Development still: `?blindAt=950` freezes the preview at that millisecond. */
export function blindPreviewOffset(search: string): number | null {
  const raw = new URLSearchParams(search).get('blindAt')
  if (raw == null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function blindStageClass(phase: BlindPhase, frozen: boolean): string {
  const risen = phase === 'rise' || phase === 'sweep' || phase === 'confirm'
  const sweeping = phase === 'sweep' || phase === 'confirm'
  const confirmed = phase === 'confirm'
  return `blind-stage${risen ? ' rise' : ''}${sweeping ? ' sweeping' : ''}${confirmed ? ' confirm' : ''}${frozen ? ' frozen' : ''}`
}

function flapsAreMoving(phase: BlindPhase, animate: boolean): boolean {
  return phase !== 'hold' && animate
}

function flapDelay(frozen: boolean, frozenAt: number | null): number {
  if (!frozen || frozenAt == null) return 0
  return Math.max(0, frozenAt - 650)
}

export function blindHeadline(phase: BlindPhase, animate: boolean): string {
  return phase === 'confirm' || !animate ? 'NEW BLINDS' : 'BLINDS INCREASING'
}

export function blindPhaseAt(ms: number): BlindPhase {
  if (ms >= 2450) return 'confirm'
  if (ms >= 1850) return 'sweep'
  if (ms >= 1250) return 'rise'
  if (ms >= 650) return 'flip'
  return 'hold'
}

export function blindPreviewNotice(search: string): BlindChangeNotice | null {
  const raw = new URLSearchParams(search).get('blindPreview')
  if (raw == null || raw === '') return null
  const parts = raw.split(',').map((part) => Number(part.trim()))
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 1)) return null
  const [previousSmallBlind, previousBigBlind, smallBlind, bigBlind] = parts
  return blindChangeFromPayload({
    smallBlind,
    bigBlind,
    previousSmallBlind,
    previousBigBlind,
    atMs: 1,
  })
}

export function blindDigitCells(from: number, to: number): { old: string; next: string }[] {
  const oldText = String(from)
  const nextText = String(to)
  const width = Math.max(oldText.length, nextText.length)
  const oldPad = oldText.padStart(width, ' ')
  const nextPad = nextText.padStart(width, ' ')
  return [...nextPad].map((next, index) => ({ old: oldPad[index] ?? ' ', next }))
}

function seenBlind(atMs: number): boolean {
  try {
    return sessionStorage.getItem(SEEN_BLIND_KEY) === String(atMs)
  } catch {
    return false
  }
}

function markBlind(atMs: number): void {
  try {
    sessionStorage.setItem(SEEN_BLIND_KEY, String(atMs))
  } catch {
    /* private browsing */
  }
}

function BlindDigit({ old, next, flipping, delay }: { old: string; next: string; flipping: boolean; delay: number }) {
  const change = flipping && old !== next
  const top = change ? next : old
  const bottom = change ? old : old
  return (
    <div className="blind-digit" style={{ ['--flap-delay' as string]: `${delay}ms` }}>
      <div className="blind-half blind-top">
        <span>{top}</span>
      </div>
      <div className="blind-half blind-bottom">
        <span>{bottom}</span>
      </div>
      {change ? (
        <>
          <div className="blind-half blind-top blind-flap">
            <span>{old}</span>
          </div>
          <div className="blind-half blind-bottom blind-flap">
            <span>{next}</span>
          </div>
        </>
      ) : null}
    </div>
  )
}

function BlindCounter({ from, to, flipping }: { from: number; to: number; flipping: boolean }) {
  const cells = blindDigitCells(from, to)
  const width = Math.min(5.2, 23 / cells.length)
  return (
    <div
      className="blind-counter"
      style={{ ['--digit-width' as string]: `${width}cqw` }}
      aria-label={String(flipping ? to : from)}
    >
      {cells.map((cell, index) => (
        <BlindDigit key={index} old={cell.old} next={cell.next} flipping={flipping} delay={index * 65} />
      ))}
    </div>
  )
}

function BlindColumn({
  label,
  from,
  to,
  flipping,
  stack,
}: {
  label: string
  from: number
  to: number
  flipping: boolean
  stack: string
}) {
  return (
    <div className="blind-column">
      <div className="blind-label">{label}</div>
      <BlindCounter from={from} to={to} flipping={flipping} />
      <img className="blind-chips" src={stack} alt="" />
      <div className="blind-halo" />
    </div>
  )
}

function useBlindMotion(
  animate: boolean,
  frozenAt: number | null,
  atMs: number,
  onFinished?: (atMs: number) => void,
  onReplay?: () => void,
) {
  const frozen = frozenAt != null
  const [open, setOpen] = useState(frozen ? frozenAt < BLIND_CHANGE_MS : true)
  const [phase, setPhase] = useState<BlindPhase>(frozen ? blindPhaseAt(frozenAt) : animate ? 'hold' : 'confirm')

  useEffect(() => {
    if (frozen) return
    const timer = window.setTimeout(() => setOpen(false), BLIND_CHANGE_MS)
    return () => window.clearTimeout(timer)
  }, [atMs, frozen])

  useEffect(() => {
    if (!open) {
      if (onReplay == null) markBlind(atMs)
      onFinished?.(atMs)
    }
  }, [open, atMs, onFinished, onReplay])

  useEffect(() => {
    if (frozen || !animate) {
      if (!frozen) setPhase('confirm')
      return
    }
    let start = 0
    let current: BlindPhase = 'hold'
    let frame = 0
    const tick = (now: number) => {
      if (start === 0) start = now
      const next = blindPhaseAt(now - start)
      if (next !== current) {
        current = next
        setPhase(next)
      }
      if (now - start < 3200) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [animate, frozen, atMs])

  return { open, phase, frozen }
}

export function BlindChangeCard({
  notice,
  onFinished,
  onReplay,
  frozenAt = null,
}: {
  notice: BlindChangeNotice
  onFinished?: (atMs: number) => void
  onReplay?: () => void
  frozenAt?: number | null
}) {
  const previous = previousPair(notice)
  const animate = previous != null
  const fromSmall = previous?.smallBlind ?? notice.smallBlind
  const fromBig = previous?.bigBlind ?? notice.bigBlind
  const { open, phase, frozen } = useBlindMotion(animate, frozenAt, notice.atMs, onFinished, onReplay)

  if (!open) return null

  return (
    <div className="blind-announce" role="dialog" aria-modal="true" aria-label="Blinds changed">
      <div
        className={blindStageClass(phase, frozen)}
        data-phase={phase}
        style={{ backgroundImage: `url(${feltUrl})`, ['--flap-elapsed' as string]: `${flapDelay(frozen, frozenAt)}ms` }}
      >
        <div className="blind-rail" style={{ backgroundImage: `url(${railUrl})` }} />
        <div className="blind-brand">Quizz’em</div>
        <div className="blind-ornament">♠</div>
        <h1 className="blind-headline">{blindHeadline(phase, animate)}</h1>
        <div className="blind-rule" />
        <div className="blind-columns">
          <BlindColumn
            label="Small blind"
            from={fromSmall}
            to={notice.smallBlind}
            flipping={flapsAreMoving(phase, animate)}
            stack={smallStackUrl}
          />
          <BlindColumn
            label="Big blind"
            from={fromBig}
            to={notice.bigBlind}
            flipping={flapsAreMoving(phase, animate)}
            stack={bigStackUrl}
          />
        </div>
        <div className="blind-sweep" />
      </div>
      {onReplay ? (
        <button type="button" className="blind-replay" onClick={onReplay}>
          Replay
        </button>
      ) : null}
    </div>
  )
}

export default function VenueBlindChange({
  notice,
  onFinished,
  onReplay,
  frozenAt = null,
}: {
  notice: BlindChangeNotice | null
  onFinished?: (atMs: number) => void
  onReplay?: () => void
  frozenAt?: number | null
}) {
  const alreadySeen = notice != null && onReplay == null && seenBlind(notice.atMs)
  useEffect(() => {
    if (alreadySeen && notice) onFinished?.(notice.atMs)
  }, [alreadySeen, notice, onFinished])
  if (notice == null || alreadySeen) return null
  return (
    <BlindChangeCard
      key={`${notice.atMs}`}
      notice={notice}
      onFinished={onFinished}
      onReplay={onReplay}
      frozenAt={frozenAt}
    />
  )
}
