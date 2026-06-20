import { useEffect, useState, type ReactNode } from 'react'
import { NeonButton } from '@qhe/ui'
import type { GamePhase, GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow, HostVenueFloorBriefPayload, VenueBlindsSnapshot } from '@qhe/net'
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

export type RunOfShowStepState = 'done' | 'current' | 'upcoming' | 'skipped'

export type RunOfShowStep = {
  id: string
  label: string
  hint: string
  state: RunOfShowStepState
}

const RUN_OF_SHOW_ORDER = [
  'assign',
  'start',
  'question',
  'close-bet-1',
  'deal-board',
  'close-bet-2',
  'start-answer',
  'reveal',
  'end-round',
] as const

export type RunOfShowStepId = (typeof RUN_OF_SHOW_ORDER)[number]

function assignStepApplies(gameState: GameState): boolean {
  return (
    gameState.phase === 'lobby' &&
    (gameState.tableId ?? '') === LOBBY_TABLE_ID &&
    gameState.players.length > 0
  )
}

function seatedVenueBeatRows(venueBeat: HostVenueFeltBeatRow[] | null): HostVenueFeltBeatRow[] {
  return venueBeat?.filter((r) => r.active && r.seated > 0) ?? []
}

/** Seated felts first; if none, any felt reporting an in-hand phase (covers seat-count lag). */
function venueBeatRowsForHostControl(venueBeat: HostVenueFeltBeatRow[] | null): HostVenueFeltBeatRow[] {
  const seated = seatedVenueBeatRows(venueBeat)
  if (seated.length > 0) return seated
  return (
    venueBeat?.filter(
      (r) => r.phase !== 'inactive' && r.phase !== 'lobby' && r.phaseStrictSig != null && r.phaseStrictSig !== '',
    ) ?? []
  )
}


function unanimousVenueBeatSig(venueBeat: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueBeatRows(venueBeat)
  if (seated.length === 0) return null
  const sigs = new Set(seated.map((r) => r.phaseStrictSig).filter((s): s is string => s != null && s !== ''))
  if (sigs.size !== 1) return null
  return [...sigs][0]!
}

/** Most advanced seated felt phase — matches venue-wall headline priority when felts drift. */
function venueBeatPhasePriority(phase: string): number {
  switch (phase) {
    case 'answering':
      return 70
    case 'showdown':
      return 65
    case 'reveal':
      return 64
    case 'payout':
      return 63
    case 'betting':
      return 50
    case 'question':
      return 40
    case 'lobby':
      return 10
    default:
      return 0
  }
}

function pickDominantVenueBeatRow(rows: HostVenueFeltBeatRow[]): HostVenueFeltBeatRow | null {
  if (rows.length === 0) return null
  let best: HostVenueFeltBeatRow | null = null
  let bestPri = -1
  for (const row of rows) {
    const pri = venueBeatPhasePriority(row.phase)
    if (
      pri > bestPri ||
      (pri === bestPri && best != null && row.tableNum < best.tableNum) ||
      (pri === bestPri && best == null)
    ) {
      best = row
      bestPri = pri
    }
  }
  return best
}

function bettingBeatProgressScore(sig: string | null): number {
  if (sig == null) return -1
  const m = /^bet\|(\d+)\|([TF?])\|cc(\d+)$/.exec(sig)
  if (!m) return 0
  const br = Number(m[1]) || 0
  const open = m[2] === 'T'
  const cc = Number(m[3]) || 0
  return br * 100 + cc * 10 + (open ? 0 : 5)
}

function pickBestRowForUnanimousPhase(
  rows: HostVenueFeltBeatRow[],
  phase: string,
): HostVenueFeltBeatRow {
  const samePhase = rows.filter((r) => r.phase === phase)
  if (samePhase.length === 0) return rows[0]!
  if (phase !== 'betting' || samePhase.length === 1) return samePhase[0]!
  return samePhase.reduce((best, row) =>
    bettingBeatProgressScore(row.phaseStrictSig) > bettingBeatProgressScore(best.phaseStrictSig) ? row : best,
  )
}

function shouldMirrorVenueBeatForHost(
  gameState: GameState,
  resolved: ResolvedVenueBeat,
): boolean {
  const tableId = gameState.tableId ?? ''
  if (tableId === LOBBY_TABLE_ID) return true
  if (resolved.phase === 'lobby' || resolved.phase === 'inactive') return false
  const hostPri = venueBeatPhasePriority(gameState.phase)
  const beatPri = venueBeatPhasePriority(resolved.phase)
  return gameState.phase === 'lobby' || beatPri > hostPri
}

type ResolvedVenueBeat = {
  phase: string
  sig: string | null
  row: HostVenueFeltBeatRow
  misaligned: boolean
}

function resolveVenueBeatForHost(venueBeat: HostVenueFeltBeatRow[] | null): ResolvedVenueBeat | null {
  const rows = venueBeatRowsForHostControl(venueBeat)
  if (rows.length === 0) return null

  const phases = new Set(rows.map((r) => r.phase))
  const unanimousPhase = phases.size === 1 ? [...phases][0]! : null
  if (unanimousPhase != null && unanimousPhase !== 'inactive') {
    const sig = unanimousVenueBeatSig(venueBeat)
    const row = pickBestRowForUnanimousPhase(rows, unanimousPhase)
    const misaligned =
      unanimousPhase === 'betting' &&
      sig == null &&
      rows.some((r) => r.phase === 'betting' && r.phaseStrictSig !== row.phaseStrictSig)
    return {
      phase: unanimousPhase,
      sig: sig ?? row.phaseStrictSig,
      row,
      misaligned,
    }
  }

  const dominant = pickDominantVenueBeatRow(rows)
  if (dominant == null || dominant.phase === 'lobby' || dominant.phase === 'inactive') return null

  return {
    phase: dominant.phase,
    sig: dominant.phaseStrictSig,
    row: dominant,
    misaligned: true,
  }
}

function syntheticControlStateFromBeatRow(
  gameState: GameState,
  venuePhase: string,
  sig: string | null,
  row: HostVenueFeltBeatRow,
): GameState {
  if (venuePhase === 'betting' && sig) {
    const m = /^bet\|(\d+)\|([TF?])\|cc(\d+)$/.exec(sig)
    if (m) {
      const cc = Math.max(0, Math.min(5, Number(m[3]) || 0))
      return {
        ...gameState,
        phase: 'betting',
        round: {
          ...gameState.round,
          bettingRound: (Number(m[1]) === 2 ? 2 : 1) as 1 | 2,
          isBettingOpen: m[2] === 'T',
          communityCards: Array.from({ length: cc }, () => ({ digit: 0 as const })),
        },
      }
    }
  }

  if (venuePhase === 'answering') {
    const dl = row.answerDeadlineMs
    return {
      ...gameState,
      phase: 'answering',
      round: {
        ...gameState.round,
        ...(typeof dl === 'number' && Number.isFinite(dl) ? { answerDeadline: dl } : {}),
      },
    }
  }

  if (venuePhase === 'showdown' || venuePhase === 'reveal' || venuePhase === 'payout') {
    return { ...gameState, phase: venuePhase as GameState['phase'] }
  }

  return { ...gameState, phase: venuePhase as GameState['phase'] }
}

function runOfShowStepFromBeatPhase(
  phase: string,
  sig: string | null,
  gameState: GameState,
): RunOfShowStepId | null {
  if (phase === 'lobby') {
    if (assignStepApplies(gameState)) return 'assign'
    return 'start'
  }
  if (phase === 'question') return 'question'
  if (phase === 'betting') {
    if (!sig) return 'close-bet-2'
    const m = /^bet\|(\d+)\|([TF?])\|cc(\d+)$/.exec(sig)
    if (m) {
      const br = m[1]
      const open = m[2] === 'T'
      const cc = Number(m[3]) || 0
      if (open && br === '1') return 'close-bet-1'
      if (open && br !== '1') return 'close-bet-2'
      if (!open && br === '1' && cc < 5) return 'deal-board'
      if (!open && cc >= 5) return 'start-answer'
      if (!open && br === '2') return 'close-bet-2'
    }
    return 'close-bet-2'
  }
  if (phase === 'answering') return 'reveal'
  if (phase === 'showdown' || phase === 'reveal' || phase === 'payout') return 'end-round'
  return null
}

/**
 * When the host mirrors the lobby pool, numbered felts may be mid-hand while LOBBY stays lobby.
 * Mirror venue phase into a synthetic control state for dock + run-of-show (unanimous or dominant felt).
 */
export function hostControlGameStateFromBeat(
  gameState: GameState,
  venueBeat: HostVenueFeltBeatRow[] | null,
): GameState {
  const resolved = resolveVenueBeatForHost(venueBeat)
  if (resolved == null || resolved.phase === 'lobby' || !shouldMirrorVenueBeatForHost(gameState, resolved)) {
    return gameState
  }
  return syntheticControlStateFromBeatRow(gameState, resolved.phase, resolved.sig, resolved.row)
}

/** Run-of-show step — uses venue felts when the host session is stale vs the floor. */
export function resolveRunOfShowStepForHost(
  gameState: GameState,
  venueBeat: HostVenueFeltBeatRow[] | null,
): RunOfShowStepId {
  const resolved = resolveVenueBeatForHost(venueBeat)
  if (resolved != null && shouldMirrorVenueBeatForHost(gameState, resolved)) {
    const step = runOfShowStepFromBeatPhase(resolved.phase, resolved.sig, gameState)
    if (step != null) return step
  }
  return resolveRunOfShowCurrentStepId(gameState)
}

export function resolveRunOfShowCurrentStepId(gameState: GameState): RunOfShowStepId {
  const phase = gameState.phase
  const bettingRound = gameState.round.bettingRound ?? 0
  const bettingOpen = gameState.round.isBettingOpen !== false
  const communityLen = gameState.round.communityCards?.length ?? 0

  if (phase === 'lobby') {
    if (assignStepApplies(gameState)) return 'assign'
    return 'start'
  }
  if (phase === 'question') {
    return 'question'
  }
  if (phase === 'betting') {
    if (bettingOpen && bettingRound <= 1) return 'close-bet-1'
    if (!bettingOpen && bettingRound === 1 && communityLen < 5) return 'deal-board'
    if (bettingOpen && bettingRound >= 2) return 'close-bet-2'
    if (communityLen >= 5 && !bettingOpen) return 'start-answer'
    if (!bettingOpen && communityLen < 5) return 'deal-board'
    return 'close-bet-2'
  }
  if (phase === 'answering') return 'reveal'
  if (phase === 'showdown' || phase === 'payout' || phase === 'reveal') return 'end-round'
  return 'start'
}

export function buildHostRunOfShowSteps(
  gameState: GameState,
  venueBeat?: HostVenueFeltBeatRow[] | null,
): RunOfShowStep[] {
  const currentId = resolveRunOfShowStepForHost(gameState, venueBeat ?? null)
  const currentIdx = RUN_OF_SHOW_ORDER.indexOf(currentId)
  const skipAssign = !assignStepApplies(gameState) && currentId !== 'assign'

  const defs: Record<RunOfShowStepId, { label: string; hint: string }> = {
    assign: {
      label: 'Seat players',
      hint: 'Move everyone from the lobby pool into random table seats.',
    },
    start: {
      label: 'Start the round',
      hint: 'Deals hole cards on every table — then reveal a question to open wagering.',
    },
    question: {
      label: 'Reveal the question',
      hint: 'Shows trivia on all tables and opens wagering round 1.',
    },
    'close-bet-1': {
      label: 'Finish wagering (round 1)',
      hint: 'Wait until every table completes pre-flop action, then close betting.',
    },
    'deal-board': {
      label: 'Deal the board',
      hint: 'Reveals all five community cards at once.',
    },
    'close-bet-2': {
      label: 'Finish wagering (round 2)',
      hint: 'Wait until post-board action is done on every table, then close betting.',
    },
    'start-answer': {
      label: 'Open answer window',
      hint: 'Starts the countdown for players to submit their numeric guess.',
    },
    reveal: {
      label: 'Reveal correct answer',
      hint: 'Shows the answer on TVs and moves tables into showdown.',
    },
    'end-round': {
      label: 'End round & pay out',
      hint: 'Settles pots and returns every table to lobby for the next hand.',
    },
  }

  return RUN_OF_SHOW_ORDER.map((id, idx) => {
    let state: RunOfShowStepState
    if (id === 'assign' && skipAssign) {
      state = 'skipped'
    } else if (idx < currentIdx) {
      state = 'done'
    } else if (id === currentId) {
      state = 'current'
    } else {
      state = 'upcoming'
    }
    const def = defs[id]
    return { id, label: def.label, hint: def.hint, state }
  })
}

/** Header phase when the host watches LOBBY but numbered felts are mid-hand. */
export function hostHeaderPhaseDisplay(
  gameState: GameState,
  hostControlState: GameState,
): { phase: string; floorMirrored: boolean } {
  const tableId = gameState.tableId ?? ''
  const floorMirrored = tableId === LOBBY_TABLE_ID && hostControlState.phase !== gameState.phase
  return {
    phase: floorMirrored ? hostControlState.phase : gameState.phase,
    floorMirrored,
  }
}

export function hostRunOfShowHeadline(
  gameState: GameState,
  venueBeat?: HostVenueFeltBeatRow[] | null,
  opts?: { hasActiveSetlist?: boolean },
): { title: string; detail?: string } {
  const controlState = hostControlGameStateFromBeat(gameState, venueBeat ?? null)
  const stepId = resolveRunOfShowStepForHost(gameState, venueBeat ?? null)
  const steps = buildHostRunOfShowSteps(gameState, venueBeat ?? null)
  const current = steps.find((s) => s.id === stepId)
  if (!current) return { title: 'Run the show' }

  const phase = controlState.phase
  const bettingRound = controlState.round.bettingRound ?? 0
  const bettingOpen = controlState.round.isBettingOpen !== false

  if (stepId === 'close-bet-1' || stepId === 'close-bet-2') {
    const idx = controlState.round.currentPlayerIndex
    const actor =
      typeof idx === 'number' && idx >= 0 ? controlState.players[idx]?.name : undefined
    return {
      title: current.label,
      detail: bettingOpen
        ? `Wagering round ${bettingRound} is live${actor ? ` — waiting on ${actor}` : ''}. Close when every table is done.`
        : current.hint,
    }
  }

  if (stepId === 'question' && !controlState.round.question) {
    return {
      title: 'Reveal the question',
      detail: 'Hole cards are dealt — pick from bank or setlist to show trivia and open wagering.',
    }
  }

  if (stepId === 'question' && controlState.round.question) {
    return {
      title: 'Question loaded — open wagering',
      detail: 'Trivia is set; wagering should open automatically when revealed from bank or setlist.',
    }
  }

  if (stepId === 'end-round' && phase === 'showdown') {
    return {
      title: 'Showdown — end the round',
      detail: 'Payout runs when you end the round. Then start the next hand from step 1.',
    }
  }

  if (stepId === 'start' && phase === 'lobby') {
    return {
      title: current.label,
      detail:
        opts?.hasActiveSetlist === true
          ? 'Every felt is between hands. Next from setlist loads the next cue, deals holes, and opens wagering in one step — or Start the round first if you prefer manual reveal.'
          : `Blinds $${gameState.smallBlind} / $${gameState.bigBlind} — confirm below, then start to deal hole cards.`,
    }
  }

  if (stepId === 'start' && phase === 'question') {
    return {
      title: 'Hole cards dealt',
      detail: 'Reveal a question from bank or setlist to open wagering round 1.',
    }
  }

  return { title: current.label, detail: current.hint }
}

export function buildHostPhaseDockItems(args: {
  gameState: GameState
  answerWindowSeconds: number
  dealCommunityBlocked: boolean
  startAnswerBlocked: boolean
  communityLen: number
  bettingRound: number
  onStartGame: () => void
  onAssignFromLobby: () => void
  onDealCommunity: () => void
  onStartAnswering: () => void
  onRevealAnswer: () => void
  onEndRound: () => void
  onRandomQuestion: () => void
  onNextSetlist: () => void
  /** Active rundown selected — show one-click Next from setlist in lobby. */
  hasActiveSetlist?: boolean
}): HostDockItem[] {
  const {
    gameState,
    answerWindowSeconds,
    dealCommunityBlocked,
    startAnswerBlocked,
    communityLen,
    bettingRound,
    onStartGame,
    onAssignFromLobby,
    onDealCommunity,
    onStartAnswering,
    onRevealAnswer,
    onEndRound,
    onRandomQuestion,
    onNextSetlist,
    hasActiveSetlist = false,
  } = args
  const phase = gameState.phase
  const tableId = gameState.tableId ?? ''
  const bettingOpen = gameState.round.isBettingOpen !== false

  if (phase === 'lobby') {
    const items: HostDockItem[] = []
    if (tableId === LOBBY_TABLE_ID && gameState.players.length > 0) {
      items.push({
        id: 'assign',
        label: 'Seat players',
        onClick: onAssignFromLobby,
        variant: 'blue',
      })
    } else {
      if (hasActiveSetlist) {
        items.push({
          id: 'setlist',
          label: 'Next from setlist',
          onClick: onNextSetlist,
          variant: 'purple',
        })
      }
      items.push({ id: 'start', label: 'Start the round', onClick: onStartGame, variant: 'emerald' })
    }
    return items
  }

  if (phase === 'question') {
    return [
      { id: 'setlist', label: 'Next from setlist', onClick: onNextSetlist, variant: 'purple' },
      { id: 'random', label: 'Random from bank', onClick: onRandomQuestion, variant: 'purple' },
    ]
  }

  if (phase === 'betting') {
    if (bettingOpen) {
      return [
        {
          id: 'close-bet',
          label: bettingRound <= 1 ? 'Finish wagering (round 1)' : 'Finish wagering (round 2)',
          onClick: () => adminCloseBetting(),
          variant: 'red',
        },
      ]
    }
    if (bettingRound === 1 && communityLen < 5) {
      return [
        {
          id: 'deal-board',
          label: 'Deal the board',
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
          label: `Open answer window (${answerWindowSeconds}s)`,
          onClick: onStartAnswering,
          disabled: startAnswerBlocked,
          variant: 'purple',
        },
      ]
    }
  }

  if (phase === 'answering') {
    return [{ id: 'reveal', label: 'Reveal correct answer', onClick: onRevealAnswer, variant: 'gold' }]
  }

  if (phase === 'showdown') {
    return [{ id: 'end-round', label: 'End round & pay out', onClick: onEndRound, variant: 'red' }]
  }

  return []
}

export function HostPhaseDock({
  items,
  statusLine,
  headline,
}: {
  items: HostDockItem[]
  statusLine?: ReactNode
  headline?: { title: string; detail?: string }
}) {
  if (items.length === 0 && !statusLine && !headline) return null
  return (
    <div className="sticky top-0 z-40 mb-4 rounded-xl border border-casino-emerald/40 bg-black/88 p-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-3">
      {headline ? (
        <div className="mb-2 border-b border-white/10 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-casino-emerald/90">
            Do this now
          </p>
          <p className="mt-0.5 text-base font-bold leading-snug text-white">{headline.title}</p>
          {headline.detail ? (
            <p className="mt-1 text-xs leading-snug text-white/55">{headline.detail}</p>
          ) : null}
        </div>
      ) : null}
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
              className="!px-4 !py-2.5 !text-base !font-bold"
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

function venueFeltBeatLockstep(rows: HostVenueFeltBeatRow[] | null): {
  seatedWithSig: HostVenueFeltBeatRow[]
  outlierTableNums: Set<number>
  lockstepMisaligned: boolean
  unanimousSig: string | null
} {
  const seatedWithSig =
    rows?.filter(
      (r) => r.active && r.seated > 0 && r.phaseStrictSig != null && r.phaseStrictSig !== '',
    ) ?? []
  if (seatedWithSig.length < 2) {
    return {
      seatedWithSig,
      outlierTableNums: new Set<number>(),
      lockstepMisaligned: false,
      unanimousSig: seatedWithSig[0]?.phaseStrictSig ?? null,
    }
  }
  const sigs = new Set(seatedWithSig.map((r) => r.phaseStrictSig!))
  if (sigs.size <= 1) {
    return {
      seatedWithSig,
      outlierTableNums: new Set<number>(),
      lockstepMisaligned: false,
      unanimousSig: seatedWithSig[0]!.phaseStrictSig!,
    }
  }
  const bySig = new Map<string, number[]>()
  for (const r of seatedWithSig) {
    const s = r.phaseStrictSig!
    if (!bySig.has(s)) bySig.set(s, [])
    bySig.get(s)!.push(r.tableNum)
  }
  let bestSig = ''
  let bestLen = -1
  for (const [sig, nums] of bySig) {
    if (nums.length > bestLen || (nums.length === bestLen && sig < bestSig)) {
      bestLen = nums.length
      bestSig = sig
    }
  }
  const outlierTableNums = new Set<number>()
  for (const [sig, nums] of bySig) {
    if (sig !== bestSig) nums.forEach((t) => outlierTableNums.add(t))
  }
  return {
    seatedWithSig,
    outlierTableNums,
    lockstepMisaligned: outlierTableNums.size > 0,
    unanimousSig: null,
  }
}

export function HostVenueFeltBeatStrip({
  rows,
  hostTableId,
}: {
  rows: HostVenueFeltBeatRow[] | null
  hostTableId: string
}) {
  const { outlierTableNums, lockstepMisaligned, unanimousSig } = venueFeltBeatLockstep(rows)
  const seatedTableCount = rows?.filter((r) => r.active && r.seated > 0).length ?? 0

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
          <span className="text-xs font-normal text-white/40">{seatedTableCount} seated</span>
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
          Amber felts differ from the majority — fix before venue-wide cues. Empty felts (0p) are
          ignored.
        </div>
      ) : unanimousSig != null && seatedTableCount >= 2 ? (
        <div
          role="status"
          className="mb-2 rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-2.5 py-1.5 text-xs font-semibold text-emerald-100"
        >
          All {seatedTableCount} seated felts in sync ({unanimousSig}) — venue-wide cues OK.
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
            const drift = row.seated > 0 && outlierTableNums.has(row.tableNum)
            return (
              <div
                key={row.tableNum}
                title={
                  watching
                    ? `Your mirrored host table (cyan ring)${sig ? ` — ${sig}` : ''}`
                    : row.seated === 0
                      ? 'Empty felt — not counted for lockstep'
                      : drift && sig
                        ? `Straggler — ${sig}`
                        : sig
                          ? unanimousSig != null
                            ? `In sync — ${sig}`
                            : `In sync with majority — ${sig}`
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

const BET_ACTION_LABEL: Record<string, string> = {
  check: 'Check',
  call: 'Call',
  raise: 'Raise',
  fold: 'Fold',
  allIn: 'All-in',
}

function formatHostFloorMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function HostVenueFloorBriefPanel({
  brief,
  hostPlayerLabel,
  hostTableId,
}: {
  brief: HostVenueFloorBriefPayload | null
  hostPlayerLabel: (name: string) => string
  hostTableId: string
}) {
  const livelyCount = brief?.actionRows.filter((r) => r.interestingAction).length ?? 0
  const rows = brief?.actionRows ?? []

  return (
    <HostCollapsible
      defaultOpen={livelyCount > 0}
      className="mb-4"
      badge={
        brief != null ? (
          <span className="text-xs font-normal text-white/40">
            {brief.liveTableCount} tables · {brief.fieldPlayerCount} in field
          </span>
        ) : null
      }
      summary={
        <span>
          Venue floor · action
          <span className="ml-1.5 hidden font-normal text-white/45 sm:inline">
            — who&apos;s acting, busts, big wins
          </span>
        </span>
      }
    >
      {brief == null ? (
        <p className="text-sm text-white/50">Waiting for venue sync…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Table action
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-white/50">No seated tables yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((row) => {
                  const watching =
                    hostTableId.trim() !== LOBBY_TABLE_ID &&
                    String(row.tableNum) === hostTableId.trim()
                  const phaseLabel = HOST_PHASE_LABEL[row.phase as GamePhase] ?? row.phase
                  return (
                    <li
                      key={row.tableNum}
                      className={`rounded-lg border px-2.5 py-2 ${
                        row.interestingAction
                          ? 'border-amber-400/45 bg-amber-950/25'
                          : 'border-white/10 bg-black/20'
                      } ${watching ? 'ring-1 ring-emerald-400/50' : ''}`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <span className="text-sm font-bold text-white/90">
                          T{row.tableNum}
                          {watching ? (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-300">
                              You
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-white/50">
                          {phaseLabel}
                          {row.pot > 0 ? ` · pot ${formatHostFloorMoney(row.pot)}` : ''}
                        </span>
                      </div>
                      {row.actingSummary ? (
                        <p className="mt-0.5 text-xs font-semibold text-amber-100/90">
                          {row.actingSummary}
                        </p>
                      ) : null}
                      {row.recentActions.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {row.recentActions.map((a, i) => (
                            <span
                              key={`${row.tableNum}-${a.seat}-${i}`}
                              className="rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white/75"
                            >
                              {hostPlayerLabel(a.name)}{' '}
                              <span className="text-white/45">
                                {BET_ACTION_LABEL[a.action] ?? a.action}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Busts
            </p>
            {brief.busts.length === 0 ? (
              <p className="text-sm text-white/50">None yet this session.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {brief.busts.map((b, i) => (
                  <li
                    key={`${b.name}-${b.tableNum}-${b.atMs}-${i}`}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-red-400/25 bg-red-950/20 px-2 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-red-100">{hostPlayerLabel(b.name)}</span>
                    <span className="shrink-0 text-white/45">T{b.tableNum}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Big wins
              <span className="ml-1 font-normal normal-case text-white/35">
                (≥ {formatHostFloorMoney(brief.bigWinMinAmount)})
              </span>
            </p>
            {brief.bigWinners.length === 0 ? (
              <p className="text-sm text-white/50">None yet this session.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {brief.bigWinners.map((w, i) => (
                  <li
                    key={`${w.name}-${w.tableNum}-${w.atMs}-${i}`}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-emerald-400/30 bg-emerald-950/20 px-2 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate font-semibold text-emerald-100">
                      {hostPlayerLabel(w.name)}
                    </span>
                    <span className="shrink-0 font-mono font-bold tabular-nums text-emerald-200">
                      +{formatHostFloorMoney(w.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </HostCollapsible>
  )
}

export function HostRunOfShowPanel({
  steps,
  children,
}: {
  steps: RunOfShowStep[]
  children?: ReactNode
}) {
  const visible = steps.filter((s) => s.state !== 'skipped')
  const doneCount = visible.filter((s) => s.state === 'done').length
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-black/25 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">Round checklist</h2>
        <span className="text-xs tabular-nums text-white/40">
          {doneCount} / {visible.length} done
        </span>
      </div>
      <ol className="space-y-1">
        {visible.map((step, i) => {
          const isCurrent = step.state === 'current'
          const isDone = step.state === 'done'
          return (
            <li
              key={step.id}
              className={`rounded-lg border px-2.5 py-2 transition-colors ${
                isCurrent
                  ? 'border-casino-emerald/45 bg-casino-emerald/10'
                  : isDone
                    ? 'border-white/8 bg-black/20 opacity-70'
                    : 'border-white/8 bg-black/15 opacity-55'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ${
                    isDone
                      ? 'bg-casino-emerald/25 text-casino-emerald'
                      : isCurrent
                        ? 'bg-casino-emerald text-black'
                        : 'bg-white/10 text-white/45'
                  }`}
                  aria-hidden
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      isCurrent ? 'text-white' : isDone ? 'text-white/65 line-through' : 'text-white/50'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent ? (
                    <>
                      <p className="mt-0.5 text-xs leading-snug text-white/55">{step.hint}</p>
                      {children ? <div className="mt-2.5 space-y-2">{children}</div> : null}
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
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
  onVenueFloor,
  onLeaderboard,
  onSpotlight,
}: {
  venueCode: string
  tableMax: number
  livelyTableNums: number[]
  onVenueFloor: () => void
  onLeaderboard: () => void
  onSpotlight: (n: number) => void
}) {
  return (
    <HostCollapsible summary="Public TVs & routing" className="mb-4">
      <p className="mb-3 text-xs leading-snug text-white/50">
        Pair displays in Setup below (venue{' '}
        <span className="font-mono text-white/65">{venueCode}</span>). Switch TVs between the{' '}
        <strong className="text-white/70">venue floor</strong> and a full-screen{' '}
        <strong className="text-white/70">leaderboard</strong>, or highlight one table.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <NeonButton variant="emerald" size="small" onClick={onVenueFloor}>
          Venue floor
        </NeonButton>
        <NeonButton variant="purple" size="small" onClick={onLeaderboard}>
          Leaderboard
        </NeonButton>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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

export function formatVenueBlindsSummary(
  blinds: Pick<
    VenueBlindsSnapshot,
    'smallBlind' | 'bigBlind' | 'blindLevelIndex' | 'blindLevelCount' | 'handsUntilNextLevel'
  >,
): string {
  let line = `$${blinds.smallBlind} / $${blinds.bigBlind}`
  line += ` · Level ${blinds.blindLevelIndex + 1}/${blinds.blindLevelCount}`
  if (blinds.handsUntilNextLevel != null) {
    line += ` · ${blinds.handsUntilNextLevel} hand(s) to next level`
  }
  return line
}

export function HostBlindsControls({
  venueSmallBlind,
  venueBigBlind,
  handsPerBlindLevel,
  blindLevelSummary,
  tableNum,
  hostTableId,
  onVenueSmallBlindChange,
  onVenueBigBlindChange,
  onHandsPerLevelChange,
  onSaveVenueBlinds,
  onSaveBlindStructure,
  onSaveTableBlinds,
  onClearTableBlinds,
  showTableOverride = true,
  compact = false,
}: {
  venueSmallBlind: number
  venueBigBlind: number
  handsPerBlindLevel: number
  blindLevelSummary: string | null
  tableNum: number
  hostTableId: string
  onVenueSmallBlindChange: (n: number) => void
  onVenueBigBlindChange: (n: number) => void
  onHandsPerLevelChange: (n: number) => void
  onSaveVenueBlinds: () => void
  onSaveBlindStructure: () => void
  onSaveTableBlinds: () => void
  onClearTableBlinds: () => void
  showTableOverride?: boolean
  compact?: boolean
}) {
  const inputClass = compact
    ? 'w-[4.5rem] rounded-md border border-white/25 bg-black/50 px-2 py-1.5 text-center text-base font-bold tabular-nums text-white'
    : 'w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white backdrop-blur-md focus:border-casino-emerald focus:outline-none'

  return (
    <div
      className={`space-y-3 rounded-lg border border-amber-400/30 bg-amber-950/20 ${compact ? 'px-3 py-2' : 'px-3 py-3'}`}
    >
      {blindLevelSummary ? (
        <p className="text-xs leading-snug text-amber-100/85">
          Venue blinds: <span className="font-semibold tabular-nums text-amber-50">{blindLevelSummary}</span>
        </p>
      ) : null}
      <div className={`flex flex-wrap items-end gap-2 ${compact ? '' : 'md:grid md:grid-cols-3 md:items-end md:gap-3'}`}>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-white/48">Small blind</label>
          <input
            type="number"
            min={1}
            value={venueSmallBlind}
            onChange={(e) => onVenueSmallBlindChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-white/48">Big blind</label>
          <input
            type="number"
            min={1}
            value={venueBigBlind}
            onChange={(e) => onVenueBigBlindChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <NeonButton variant="gold" size={compact ? 'small' : 'normal'} type="button" onClick={onSaveVenueBlinds}>
          Save venue blinds
        </NeonButton>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-white/48">
            Level up every (hands)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={handsPerBlindLevel}
            onChange={(e) => onHandsPerLevelChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <NeonButton variant="blue" size={compact ? 'small' : 'normal'} type="button" onClick={onSaveBlindStructure}>
          Save schedule
        </NeonButton>
      </div>
      {showTableOverride ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-2">
          <p className="w-full text-[10px] font-semibold uppercase tracking-wide text-white/48">
            Per-table override (table {tableNum})
          </p>
          <NeonButton variant="emerald" size={compact ? 'small' : 'normal'} type="button" onClick={onSaveTableBlinds}>
            Use current SB/BB on table {tableNum}
          </NeonButton>
          <NeonButton variant="gold" size={compact ? 'small' : 'normal'} type="button" onClick={onClearTableBlinds}>
            Revert table {hostTableId !== LOBBY_TABLE_ID ? hostTableId : tableNum} to venue
          </NeonButton>
        </div>
      ) : null}
    </div>
  )
}
