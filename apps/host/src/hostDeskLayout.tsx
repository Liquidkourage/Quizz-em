import { useEffect, useState, type ReactNode } from 'react'
import { NeonButton } from '@qhe/ui'
import type { GamePhase, GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { formatTriviaNumber, LOBBY_TABLE_ID } from '@qhe/core'
import { adminCloseBetting } from '@qhe/net'

const HOST_PHASE_LABEL: Record<GamePhase, string> = {
  lobby: 'Lobby',
  question: 'Question / deal setup',
  betting: 'Wagering',
  answering: 'Answering',
  reveal: 'Reveal',
  showdown: 'Showdown',
  payout: 'Payout',
  intermission: 'Intermission',
}

export function HostCollapsible({
  summary,
  defaultOpen = false,
  forceOpen = false,
  children,
  className = '',
  badge,
}: {
  summary: ReactNode
  defaultOpen?: boolean
  forceOpen?: boolean
  children: ReactNode
  className?: string
  badge?: ReactNode
}) {
  return (
    <details
      className={`group rounded-xl border border-white/10 bg-black/25 open:border-white/[0.14] [&_summary::-webkit-details-marker]:hidden ${className}`}
      open={forceOpen || defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/[0.04] hover:text-white/88">
        <span className="flex min-w-0 items-center gap-2">
          {summary}
          {badge}
        </span>
        <span className="shrink-0 text-white/35 transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="border-t border-white/10 px-3 py-3">{children}</div>
    </details>
  )
}

export type HostDockItem = {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  variant: 'emerald' | 'blue' | 'purple' | 'gold' | 'red'
}

export function buildHostPhaseDockItems(args: {
  gameState: GameState
  answerWindowSeconds: number
  dealInitialBlocked: boolean
  dealCommunityBlocked: boolean
  startAnswerBlocked: boolean
  communityLen: number
  bettingRound: number
  onStartGame: () => void
  onAssignFromLobby: () => void
  onDealInitial: () => void
  onDealCommunity: () => void
  onStartAnswering: () => void
  onRevealAnswer: () => void
  onEndRound: () => void
  onRandomQuestion: () => void
  onNextSetlist: () => void
}): HostDockItem[] {
  const {
    gameState,
    answerWindowSeconds,
    dealInitialBlocked,
    dealCommunityBlocked,
    startAnswerBlocked,
    communityLen,
    bettingRound,
    onStartGame,
    onAssignFromLobby,
    onDealInitial,
    onDealCommunity,
    onStartAnswering,
    onRevealAnswer,
    onEndRound,
    onRandomQuestion,
    onNextSetlist,
  } = args
  const phase = gameState.phase
  const tableId = gameState.tableId ?? ''
  const bettingOpen = gameState.round.isBettingOpen !== false

  if (phase === 'lobby') {
    const items: HostDockItem[] = [
      { id: 'start', label: 'Start Game', onClick: onStartGame, variant: 'emerald' },
    ]
    if (tableId === LOBBY_TABLE_ID && gameState.players.length > 0) {
      items.push({
        id: 'assign',
        label: 'Assign from lobby',
        onClick: onAssignFromLobby,
        variant: 'blue',
      })
    }
    return items
  }

  if (phase === 'question') {
    return [
      {
        id: 'deal-initial',
        label: 'Deal Initial Cards',
        onClick: onDealInitial,
        disabled: dealInitialBlocked,
        variant: 'blue',
      },
      { id: 'random', label: 'Random from bank', onClick: onRandomQuestion, variant: 'purple' },
      { id: 'setlist', label: 'Next from setlist', onClick: onNextSetlist, variant: 'purple' },
    ]
  }

  if (phase === 'betting') {
    if (bettingOpen) {
      return [
        {
          id: 'close-bet',
          label: 'Close Betting',
          onClick: () => adminCloseBetting(),
          variant: 'red',
        },
      ]
    }
    if (bettingRound === 1 && communityLen < 5) {
      return [
        {
          id: 'deal-board',
          label: 'Deal Community Cards',
          onClick: onDealCommunity,
          disabled: dealCommunityBlocked,
          variant: 'blue',
        },
      ]
    }
    if (communityLen >= 5) {
      return [
        {
          id: 'start-answer',
          label: `Start answering (${answerWindowSeconds}s)`,
          onClick: onStartAnswering,
          disabled: startAnswerBlocked,
          variant: 'purple',
        },
      ]
    }
  }

  if (phase === 'answering') {
    return [{ id: 'reveal', label: 'Reveal Answer', onClick: onRevealAnswer, variant: 'gold' }]
  }

  if (phase === 'showdown') {
    return [{ id: 'end-round', label: 'End Round', onClick: onEndRound, variant: 'red' }]
  }

  return []
}

export function HostPhaseDock({
  items,
  statusLine,
}: {
  items: HostDockItem[]
  statusLine?: ReactNode
}) {
  if (items.length === 0 && !statusLine) return null
  return (
    <div className="sticky top-0 z-40 mb-4 rounded-xl border border-casino-emerald/40 bg-black/88 p-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-3">
      {statusLine ? (
        <div className="mb-2 border-b border-white/10 pb-2">{statusLine}</div>
      ) : null}
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Primary show cues">
          {items.map((item) => (
            <NeonButton
              key={item.id}
              variant={item.variant}
              size="normal"
              disabled={item.disabled}
              onClick={item.onClick}
              className="!px-4 !py-2"
            >
              {item.label}
            </NeonButton>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function HostLiveStatusLine({
  gameState,
  hostPlayerLabel,
  virtualSeatCount,
}: {
  gameState: GameState
  hostPlayerLabel: (raw: string) => string
  virtualSeatCount: number
}) {
  const pot = gameState.round.pot
  const question = gameState.round.question
  const phase = gameState.phase
  const bettingRound = gameState.round.bettingRound ?? 0
  const bettingOpen = gameState.round.isBettingOpen !== false

  const [, setTick] = useState(0)
  useEffect(() => {
    if (phase !== 'answering') return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-snug">
      <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-semibold capitalize text-white/80">
        {HOST_PHASE_LABEL[phase] ?? phase}
      </span>
      <span className="font-mono font-bold tabular-nums text-casino-emerald">
        Pot ${Math.max(0, Math.round(pot)).toLocaleString()}
      </span>
      <span className="text-white/50">
        {gameState.players.length} seated
        {virtualSeatCount > 0 ? (
          <span className="text-amber-200/80"> · {virtualSeatCount} CPU</span>
        ) : null}
      </span>
      {question ? (
        <span className="min-w-0 max-w-[min(100%,28rem)] truncate font-medium text-casino-gold" title={question.text}>
          {question.text}
        </span>
      ) : null}
      {phase === 'betting' && bettingOpen ? (
        <span className="font-semibold text-amber-200/90">
          R{bettingRound} · action on{' '}
          {(() => {
            const idx = gameState.round.currentPlayerIndex
            const p = typeof idx === 'number' && idx >= 0 ? gameState.players[idx] : undefined
            return p ? hostPlayerLabel(p.name) : '—'
          })()}
        </span>
      ) : null}
      {phase === 'answering' ? (
        <span className="font-mono text-base font-bold tabular-nums text-casino-gold">
          {Math.max(0, Math.ceil(((gameState.round.answerDeadline ?? 0) - Date.now()) / 1000))}s
        </span>
      ) : null}
      {phase === 'showdown' && typeof question?.answer === 'number' ? (
        <span className="font-mono font-bold text-casino-gold">
          Answer {formatTriviaNumber(question.answer)}
        </span>
      ) : null}
    </div>
  )
}

export function HostVenueFeltBeatStrip({
  rows,
  hostTableId,
}: {
  rows: HostVenueFeltBeatRow[] | null
  hostTableId: string
}) {
  const activeWithSig =
    rows?.filter((r) => r.active && r.phaseStrictSig != null && r.phaseStrictSig !== '') ?? []
  const outlierTableNums = (() => {
    if (activeWithSig.length < 2) return new Set<number>()
    const bySig = new Map<string, number[]>()
    for (const r of activeWithSig) {
      const s = r.phaseStrictSig!
      if (!bySig.has(s)) bySig.set(s, [])
      bySig.get(s)!.push(r.tableNum)
    }
    if (bySig.size <= 1) return new Set<number>()
    let bestSig = ''
    let bestLen = -1
    for (const [sig, nums] of bySig) {
      if (nums.length > bestLen || (nums.length === bestLen && sig < bestSig)) {
        bestLen = nums.length
        bestSig = sig
      }
    }
    const out = new Set<number>()
    for (const [sig, nums] of bySig) {
      if (sig !== bestSig) nums.forEach((t) => out.add(t))
    }
    return out
  })()
  const lockstepMisaligned = outlierTableNums.size > 0
  const activeCount = rows?.filter((r) => r.active).length ?? 0

  const hasLiveCountdown =
    rows?.some((r) => r.phase === 'answering' && r.answerDeadlineMs != null) ?? false
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!hasLiveCountdown) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [hasLiveCountdown])

  return (
    <HostCollapsible
      forceOpen={lockstepMisaligned}
      className="mb-4"
      badge={
        lockstepMisaligned ? (
          <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
            Misaligned
          </span>
        ) : rows != null ? (
          <span className="text-xs font-normal text-white/40">{activeCount} active</span>
        ) : null
      }
      summary={
        <span>
          Venue felts · beat
          <span className="ml-1.5 hidden font-normal text-white/45 sm:inline">
            — lockstep diagnostic
          </span>
        </span>
      }
    >
      {lockstepMisaligned ? (
        <div
          role="status"
          className="mb-2 rounded-lg border border-amber-400/55 bg-amber-950/35 px-2.5 py-1.5 text-xs font-semibold text-amber-100"
        >
          Amber felts differ from the majority — fix before venue-wide cues.
        </div>
      ) : null}
      {rows == null ? (
        <p className="text-sm text-white/50">Waiting for first venue sync…</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
          {rows.map((row) => {
            const watching =
              hostTableId.trim() !== LOBBY_TABLE_ID && String(row.tableNum) === hostTableId.trim()
            const phaseLabel =
              row.phase === 'inactive' ? '—' : HOST_PHASE_LABEL[row.phase as GamePhase] ?? row.phase
            const countdownSec =
              row.phase === 'answering' && row.answerDeadlineMs != null
                ? Math.max(0, Math.ceil((row.answerDeadlineMs - Date.now()) / 1000))
                : null
            const sig = row.phaseStrictSig ?? null
            const drift = row.active && outlierTableNums.has(row.tableNum)
            return (
              <div
                key={row.tableNum}
                title={
                  drift && sig
                    ? `Straggler — ${sig}`
                    : lockstepMisaligned && row.active && sig
                      ? sig
                      : undefined
                }
                className={`rounded-md border px-1.5 py-1 text-center sm:min-h-[3.75rem] ${
                  row.active
                    ? drift
                      ? 'border-amber-400/85 bg-amber-950/25'
                      : 'border-white/20 bg-black/35'
                    : 'border-white/10 bg-black/22 opacity-75'
                } ${watching ? 'ring-1 ring-cyan-400/65' : ''}`}
              >
                <div className="text-[10px] font-bold tabular-nums text-yellow-400/90">{row.tableNum}</div>
                <div className="truncate text-[10px] font-semibold leading-tight text-white/85">
                  {phaseLabel}
                </div>
                <div className="text-[9px] tabular-nums text-white/45">
                  {row.active ? `${row.seated}p` : '—'}
                  {countdownSec != null ? (
                    <span className="block font-mono text-casino-gold">{countdownSec}s</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </HostCollapsible>
  )
}

/** Slim action-on-floor strip — TV routing only. */
export function HostActionFloorBanner({
  tableNums,
  onSpotlight,
}: {
  tableNums: number[]
  onSpotlight: (tableNum: number) => void
}) {
  if (tableNums.length === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/70 bg-amber-950/40 px-3 py-2 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-200" />
      </span>
      <span className="text-sm font-bold text-amber-100">
        Live: {tableNums.length === 1 ? `Table ${tableNums[0]}` : `${tableNums.length} tables`}
      </span>
      <span className="hidden font-mono text-xs text-amber-200/80 sm:inline">
        {tableNums.join(', ')}
      </span>
      <div className="ml-auto flex flex-wrap gap-1.5">
        {tableNums.map((n) => (
          <NeonButton
            key={n}
            variant="gold"
            size="small"
            type="button"
            className="!px-2 !py-1 text-xs"
            title={`Highlight Table ${n} on the venue wall`}
            onClick={() => onSpotlight(n)}
          >
            TV {n}
          </NeonButton>
        ))}
      </div>
    </div>
  )
}

export function HostPublicTvsPanel({
  venueCode,
  tableMax,
  livelyTableNums,
  onVenueWall,
  onSpotlight,
}: {
  venueCode: string
  tableMax: number
  livelyTableNums: number[]
  onVenueWall: () => void
  onSpotlight: (n: number) => void
}) {
  return (
    <HostCollapsible summary="Public TVs & routing" className="mb-4">
      <p className="mb-3 text-xs leading-snug text-white/50">
        Pair displays in Setup below. During a round the venue wall always shows every table;{' '}
        <strong className="text-white/70">Highlight</strong> pins the amber ring on one felt.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <NeonButton variant="emerald" size="small" onClick={onVenueWall}>
          Clear highlight
        </NeonButton>
        <span className="text-[10px] uppercase tracking-wide text-white/35">Highlight</span>
        {Array.from({ length: Math.min(20, tableMax) }, (_, i) => i + 1).map((n) => {
          const lively = livelyTableNums.includes(n)
          return (
            <NeonButton
              key={n}
              variant="gold"
              size="small"
              className={`!min-w-[2rem] !px-2 !py-1 ${lively ? 'ring-2 ring-amber-400/70' : ''}`}
              onClick={() => onSpotlight(n)}
            >
              {n}
            </NeonButton>
          )
        })}
      </div>
    </HostCollapsible>
  )
}
