import { Children, useEffect, useState, type ReactNode } from 'react'
import { HostModal, useHostModalNested } from './HostModal'
import { ChipText, NeonButton } from '@qhe/ui'
import type { GamePhase, GameState } from '@qhe/core'
import type {
  HostVenueBigBetEntry,
  HostVenueFeltBeatRow,
  HostVenueRecentAction,
  HostVenueSeatContest,
  HostVenueFloorBriefPayload,
  HostVenueMoveLogEntry,
  VenueBlindsSnapshot,
  VenueWallViewMode,
} from '@qhe/net'
import { formatTriviaNumber, LOBBY_TABLE_ID, playersHaveHoleCards, VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { adminCloseBetting, TABLE_PHASE_OVERRIDES } from '@qhe/net'
import { hostContestReasonLabel, hostContestStatus } from './hostContestStatus'

const HOST_PHASE_LABEL: Record<GamePhase, string> = {
  lobby: 'Waiting room',
  question: 'Deal / question',
  betting: 'Betting',
  answering: 'Guessing',
  reveal: 'Answer reveal',
  showdown: 'Results',
  payout: 'Paying out',
  intermission: 'Break',
}

/** One color per felt phase. A closed betting clock gets its own tone. */
const TABLE_ACTION_TONE: Record<string, string> = {
  lobby: 'border-slate-400/35 bg-slate-900/50 text-slate-200',
  question: 'border-sky-400/45 bg-sky-950/40 text-sky-100',
  betting: 'border-orange-400/50 bg-orange-950/40 text-orange-100',
  betsClosed: 'border-teal-300/60 bg-teal-950/45 text-teal-50',
  answering: 'border-violet-400/45 bg-violet-950/40 text-violet-100',
  reveal: 'border-pink-400/45 bg-pink-950/35 text-pink-100',
  showdown: 'border-emerald-400/40 bg-emerald-950/30 text-emerald-100',
  payout: 'border-yellow-300/50 bg-yellow-950/30 text-yellow-100',
  intermission: 'border-zinc-400/35 bg-zinc-900/50 text-zinc-200',
}

/** Player the host can put on a 30s clock from this table card. */
export function actingNudgeName(row: {
  phase: string
  betsClosed?: boolean
  actingPlayerName?: string | null
}): string | null {
  if (row.phase !== 'betting' || row.betsClosed === true) return null
  const name = row.actingPlayerName?.trim()
  return name ? name : null
}

function tableActionCue(row: {
  phase: string
  betsClosed?: boolean
  answersSubmitted?: number
  answersExpected?: number
}): { label: string; tone: string } {
  if (row.phase === 'betting' && row.betsClosed === true) {
    return { label: 'No more bets', tone: TABLE_ACTION_TONE.betsClosed }
  }
  const phase = row.phase as GamePhase
  const tone = TABLE_ACTION_TONE[row.phase] ?? 'border-white/10 bg-black/20 text-white/55'
  if (phase === 'answering' && row.answersExpected != null) {
    const submitted = row.answersSubmitted ?? 0
    return { label: `Guessing · ${submitted}/${row.answersExpected} submitted`, tone }
  }
  return {
    label: HOST_PHASE_LABEL[phase] ?? row.phase,
    tone,
  }
}

/** Empty venue pool — no one to seat yet (brand-new host empty desk). */
export function isHostWaitingForJoiners(gameState: GameState): boolean {
  return (
    gameState.phase === 'lobby' &&
    (gameState.tableId ?? '') === LOBBY_TABLE_ID &&
    gameState.players.length === 0
  )
}

function HostOpenButton({
  appearance,
  summary,
  badge,
  onOpen,
}: {
  appearance: 'bar' | 'button'
  summary: ReactNode
  badge?: ReactNode
  onOpen: () => void
}) {
  if (appearance === 'button') {
    return (
      <button
        type="button"
        className="host-open-button flex min-h-[4.5rem] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-sky-300/50 bg-sky-950/55 px-2 py-2 text-center text-base font-bold text-white hover:bg-sky-900/70"
        onClick={onOpen}
      >
        <span className="flex flex-col items-center gap-0.5 leading-tight">
          {summary}
          {badge}
        </span>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-sky-100">Open</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-left text-base font-semibold text-white/75 hover:bg-white/[0.04] hover:text-white/88"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-center gap-2">
        {summary}
        {badge}
      </span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-sky-200/80">Open</span>
    </button>
  )
}

export function HostCollapsible({
  summary,
  buttonSummary,
  defaultOpen = false,
  forceOpen = false,
  children,
  className = '',
  badge,
  toolbar,
  expanded = false,
  appearance = 'bar',
}: {
  summary: ReactNode
  /** Short face for a live-desk button. The popup title keeps `summary`. */
  buttonSummary?: ReactNode
  defaultOpen?: boolean
  forceOpen?: boolean
  children: ReactNode
  className?: string
  badge?: ReactNode
  /** Sits on the right of an expanded section header. */
  toolbar?: ReactNode
  /** Live floor: show the section on the page instead of behind Open. */
  expanded?: boolean
  /** `button` is a compact control. `bar` is a full-width label row. */
  appearance?: 'bar' | 'button'
}) {
  const nested = useHostModalNested()
  const [open, setOpen] = useState(() => forceOpen || (defaultOpen && !nested))

  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  if (expanded) {
    return (
      <section className={`host-instrument flex flex-col overflow-hidden rounded-xl border border-white/10 ${className}`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-white/10 px-3 py-2 text-lg font-semibold text-white/85">
          <span className="flex min-w-0 items-center gap-2">
            {summary}
            {badge}
          </span>
          {toolbar ? <div className="min-w-0 text-base font-normal">{toolbar}</div> : null}
        </div>
        <div className="px-3 py-2">{children}</div>
      </section>
    )
  }

  return (
    <div className={className}>
      <HostOpenButton
        appearance={appearance}
        summary={buttonSummary ?? summary}
        badge={badge}
        onOpen={() => setOpen(true)}
      />
      <HostModal
        title={
          <span className="flex min-w-0 items-center gap-2">
            {summary}
            {badge}
          </span>
        }
        open={open}
        onClose={() => setOpen(false)}
      >
        {children}
      </HostModal>
    </div>
  )
}

export type HostDockItem = {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  variant: 'emerald' | 'blue' | 'purple' | 'gold' | 'red'
  /** primary = large CTA; secondary = quieter chip; danger = recovery overflow */
  role?: 'primary' | 'secondary' | 'danger'
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
  'question',
  'start',
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
    return 'question'
  }
  if (phase === 'question') return gameState.round.question != null ? 'start' : 'question'
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

/**
 * The felt beat carries the live question even when this desk's table snapshot is still the waiting room.
 * Stamp that question onto the control state so Deal and the question card can appear.
 */
export function hostDeskStateWithLiveQuestion(
  gameState: GameState,
  venueBeat: HostVenueFeltBeatRow[] | null,
): GameState {
  const control = hostControlGameStateFromBeat(gameState, venueBeat)
  if (control.round.question != null) return control
  const tableRaw = gameState.tableId ?? ''
  const focusNum =
    tableRaw !== LOBBY_TABLE_ID && tableRaw !== '' ? Number.parseInt(tableRaw, 10) : NaN
  const focusRow =
    Number.isFinite(focusNum) ? venueBeat?.find((r) => r.tableNum === focusNum) : undefined
  const row =
    focusRow?.questionText
      ? focusRow
      : venueBeat?.find((r) => r.active && r.questionText && r.questionAnswer != null)
  if (!row?.questionText || row.questionAnswer == null || !Number.isFinite(row.questionAnswer)) {
    return control
  }
  return {
    ...control,
    phase: control.phase === 'lobby' ? 'question' : control.phase,
    round: {
      ...control.round,
      question: {
        id: `table-${row.tableNum}`,
        text: row.questionText,
        answer: row.questionAnswer,
      },
    },
  }
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
    return 'question'
  }
  if (phase === 'question') {
    return gameState.round.question != null ? 'start' : 'question'
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
      hint: 'Split everyone in the waiting room onto tables at random.',
    },
    start: {
      label: 'Deal cards',
      hint: 'Gives each player two private cards and opens the first betting round.',
    },
    question: {
      label: 'Show the question',
      hint: 'Puts the trivia question on phones and TVs. Cards stay in the deck until you deal.',
    },
    'close-bet-1': {
      label: 'Close betting (1st round)',
      hint: 'When everyone has checked, called, raised, or folded — close this betting round.',
    },
    'deal-board': {
      label: 'Reveal shared cards',
      hint: 'Flips the five shared cards in the middle of every table.',
    },
    'close-bet-2': {
      label: 'Close betting (2nd round)',
      hint: 'When everyone is done betting on the shared cards — close this round.',
    },
    'start-answer': {
      label: 'Open guessing',
      hint: 'Players submit their trivia guess on their phones. You stop the timer with Reveal.',
    },
    reveal: {
      label: 'Reveal the answer',
      hint: 'Shows the correct number on TVs, then moves to results.',
    },
    'end-round': {
      label: 'Pay winners',
      hint: 'Pays chip pots, scores trivia points, then resets for the next hand.',
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
  const floorAhead = hostControlState.phase !== gameState.phase
  return {
    phase: floorAhead ? hostControlState.phase : gameState.phase,
    floorMirrored: tableId === LOBBY_TABLE_ID && floorAhead,
  }
}

export function hostRunOfShowHeadline(
  gameState: GameState,
  venueBeat?: HostVenueFeltBeatRow[] | null,
  opts?: { hasActiveSetlist?: boolean; nextQuestionText?: string; afterPayout?: boolean },
): { title: string; detail?: string } {
  const controlState = hostControlGameStateFromBeat(gameState, venueBeat ?? null)
  const stepId = resolveRunOfShowStepForHost(gameState, venueBeat ?? null)
  const steps = buildHostRunOfShowSteps(gameState, venueBeat ?? null)
  const current = steps.find((s) => s.id === stepId)
  if (!current) return { title: 'Run the show' }

  const phase = controlState.phase

  if (stepId === 'close-bet-1' || stepId === 'close-bet-2') {
    const idx = controlState.round.currentPlayerIndex
    const actor =
      typeof idx === 'number' && idx >= 0 ? controlState.players[idx]?.name : undefined
    return {
      title: current.label,
      detail: actor ? `Waiting on ${actor}` : undefined,
    }
  }

  if (isHostWaitingForJoiners(gameState)) {
    return { title: 'Waiting for players to join' }
  }

  if (stepId === 'assign') {
    return { title: 'Seat everyone at tables' }
  }

  if (stepId === 'question' && !controlState.round.question) {
    return {
      title: 'Show the trivia question',
      detail: opts?.nextQuestionText ? `Next up: ${opts.nextQuestionText}` : undefined,
    }
  }

  if (stepId === 'start' && controlState.round.question != null && !playersHaveHoleCards(controlState)) {
    return { title: 'Deal cards' }
  }

  if (stepId === 'question' && controlState.round.question) {
    return { title: 'Question is live' }
  }

  if (stepId === 'end-round' && phase === 'reveal') {
    return { title: 'Answer is on the TVs' }
  }

  if (stepId === 'end-round' && phase === 'showdown') {
    return { title: 'Pay winners & clear the hand' }
  }

  if (stepId === 'start' && phase === 'question') {
    return { title: 'Open betting' }
  }

  return { title: current.label }
}

export function buildHostPhaseDockItems(args: {
  gameState: GameState
  answerWindowSeconds: number
  dealCommunityBlocked: boolean
  closeBetBlocked: boolean
  startAnswerBlocked: boolean
  /** A player is still betting, so Reveal the answer stays off. */
  revealAnswerBlocked?: boolean
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
  /** 30s countdown on acting humans, then auto check/fold. */
  onNudgeActing: () => void
  /** Skip one stuck actor mid-wager (danger secondary). */
  onForceAdvance?: () => void
  /** Rehearsal dry-run — jump venue wall to winner overlay without waiting for timers. */
  onRehearsalSkipToShowdown?: () => void
  /** Active rundown selected — show one-click Next from setlist in lobby. */
  hasActiveSetlist?: boolean
  /** Venue hands already paid. Zero while waiting to start question 1. */
  handsCompleted?: number
}): HostDockItem[] {
  const {
    gameState,
    answerWindowSeconds,
    dealCommunityBlocked,
    closeBetBlocked,
    startAnswerBlocked,
    revealAnswerBlocked = false,
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
    onNudgeActing,
    onForceAdvance,
    onRehearsalSkipToShowdown,
    hasActiveSetlist = false,
    handsCompleted = 0,
  } = args
  const setlistCue = handsCompleted <= 0 ? 'Start Game' : 'Next question'
  const phase = gameState.phase
  const tableId = gameState.tableId ?? ''
  const bettingOpen = gameState.round.isBettingOpen !== false

  const withRehearsalSkip = (items: HostDockItem[]): HostDockItem[] => {
    if (!onRehearsalSkipToShowdown) return items
    const cpuOnly =
      gameState.players.length > 0 && gameState.players.every((p) => p.id.startsWith('vp:'))
    if (!cpuOnly || phase === 'showdown' || phase === 'reveal') return items
    return [
      ...items,
      {
        id: 'rehearsal-skip-showdown',
        label: 'Skip to winner screen',
        onClick: onRehearsalSkipToShowdown,
        variant: 'gold',
        role: 'secondary',
      },
    ]
  }

  if (phase === 'lobby') {
    const items: HostDockItem[] = []
    if (tableId === LOBBY_TABLE_ID && gameState.players.length > 0) {
      items.push({
        id: 'assign',
        label: 'Seat players at tables',
        onClick: onAssignFromLobby,
        variant: 'blue',
        role: 'primary',
      })
    } else if (isHostWaitingForJoiners(gameState)) {
      // No premature Start — nothing to deal yet.
      return []
    } else if (hasActiveSetlist) {
      items.push({
        id: 'setlist',
        label: setlistCue,
        onClick: onNextSetlist,
        variant: 'purple',
        role: 'primary',
      })
    } else {
      items.push({
        id: 'random',
        label: 'Show a random question',
        onClick: onRandomQuestion,
        variant: 'purple',
        role: 'primary',
      })
    }
    return withRehearsalSkip(items)
  }

  if (phase === 'question') {
    const questionLive = gameState.round.question != null
    const holesDealt = playersHaveHoleCards(gameState)
    if (questionLive && !holesDealt) {
      const dealItems: HostDockItem[] = [
        {
          id: 'start',
          label: 'Deal hole cards',
          onClick: onStartGame,
          variant: 'emerald',
          role: 'primary',
        },
      ]
      if (hasActiveSetlist) {
        dealItems.push({
          id: 'setlist',
          label: 'Different question',
          onClick: onNextSetlist,
          variant: 'purple',
          role: 'secondary',
        })
      } else {
        dealItems.push({
          id: 'random',
          label: 'Different question',
          onClick: onRandomQuestion,
          variant: 'purple',
          role: 'secondary',
        })
      }
      return withRehearsalSkip(dealItems)
    }
    if (questionLive && holesDealt) {
      return withRehearsalSkip([
        {
          id: 'start',
          label: 'Open betting',
          onClick: onStartGame,
          variant: 'emerald',
          role: 'primary',
        },
      ])
    }
    if (hasActiveSetlist) {
      return withRehearsalSkip([
        {
          id: 'setlist',
          label: setlistCue,
          onClick: onNextSetlist,
          variant: 'purple',
          role: 'primary',
        },
      ])
    }
    return withRehearsalSkip([
      {
        id: 'random',
        label: 'Show a random question',
        onClick: onRandomQuestion,
        variant: 'purple',
        role: 'primary',
      },
    ])
  }

  if (phase === 'betting') {
    if (bettingOpen) {
      const items: HostDockItem[] = [
        {
          id: 'close-bet',
          label: bettingRound <= 1 ? 'Close 1st betting round' : 'Close 2nd betting round',
          onClick: () => adminCloseBetting(),
          disabled: closeBetBlocked,
          variant: 'red',
          role: 'primary',
        },
        {
          id: 'nudge',
          label: 'Nudge slow player',
          onClick: onNudgeActing,
          variant: 'gold',
          role: 'secondary',
        },
      ]
      if (onForceAdvance) {
        items.push({
          id: 'force-advance',
          label: 'Skip this player',
          onClick: onForceAdvance,
          variant: 'gold',
          role: 'danger',
        })
      }
      return withRehearsalSkip(items)
    }
    if (bettingRound === 1 && communityLen < 5) {
      return withRehearsalSkip([
        {
          id: 'deal-board',
          label: 'Reveal shared cards',
          onClick: onDealCommunity,
          disabled: dealCommunityBlocked,
          variant: 'blue',
          role: 'primary',
        },
      ])
    }
    if (communityLen >= 5) {
      return withRehearsalSkip([
        {
          id: 'start-answer',
          label: `Open guessing (${answerWindowSeconds}s)`,
          onClick: onStartAnswering,
          disabled: startAnswerBlocked,
          variant: 'purple',
          role: 'primary',
        },
      ])
    }
  }

  if (phase === 'answering') {
    return withRehearsalSkip([
      {
        id: 'reveal',
        label: 'Reveal the answer',
        onClick: onRevealAnswer,
        disabled: revealAnswerBlocked,
        variant: 'gold',
        role: 'primary',
      },
    ])
  }

  if (phase === 'reveal' || phase === 'showdown') {
    return [
      {
        id: 'end-round',
        label: 'Pay winners',
        onClick: onEndRound,
        variant: 'red',
        role: 'primary',
      },
    ]
  }

  return withRehearsalSkip([])
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-casino-emerald/90">
            Your next step
          </p>
          <p className="mt-0.5 text-base font-bold leading-snug text-white">{headline.title}</p>
          {headline.detail ? (
            <p className="mt-1 text-xs leading-snug text-white/55">
              <ChipText text={headline.detail} />
            </p>
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
              className="!px-5 !py-3 !text-lg !font-bold"
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
  const waiting = isHostWaitingForJoiners(gameState)
  const inLobbyPool =
    phase === 'lobby' && (gameState.tableId ?? '') === LOBBY_TABLE_ID

  const [, setTick] = useState(0)
  useEffect(() => {
    if (phase !== 'answering') return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  if (waiting) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-snug">
        <span className="rounded-md border border-sky-400/35 bg-sky-950/40 px-2 py-0.5 font-semibold text-sky-100">
          Waiting room
        </span>
        <span className="text-white/55">
          Room <span className="font-mono font-semibold text-white/85">{gameState.code}</span>
        </span>
        <span className="text-white/40">No players yet</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-snug">
      <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-semibold text-white/80">
        {HOST_PHASE_LABEL[phase] ?? phase}
      </span>
      {!inLobbyPool || pot > 0 ? (
        <span className="font-mono font-bold tabular-nums text-casino-emerald">
          Pot <ChipText text={`$${Math.max(0, Math.round(pot)).toLocaleString()}`} />
        </span>
      ) : null}
      <span className="text-white/50">
        {inLobbyPool
          ? `${gameState.players.length} waiting`
          : `${gameState.players.length} at this table`}
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
          Betting round {bettingRound} · waiting on{' '}
          {(() => {
            const idx = gameState.round.currentPlayerIndex
            const p = typeof idx === 'number' && idx >= 0 ? gameState.players[idx] : undefined
            return p ? hostPlayerLabel(p.name) : '—'
          })()}
        </span>
      ) : null}
      {phase === 'answering' ? (
        <span className="font-mono text-base font-bold tabular-nums text-casino-gold">
          {Math.max(0, Math.ceil(((gameState.round.answerDeadline ?? 0) - Date.now()) / 1000))}s left
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

/** True when seated felts disagree on phase fingerprint (floor strip / move log). */
export function hostFloorLockstepMisaligned(rows: HostVenueFeltBeatRow[] | null): boolean {
  return venueFeltBeatLockstep(rows).lockstepMisaligned
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

/** Beats the host can force onto the table they just clicked. */
export function HostFeltPhasePicker({
  tableNum,
  onPick,
}: {
  tableNum: number
  onPick: (signature: string) => void
}) {
  return (
    <div className="mb-2 rounded-lg border border-white/15 bg-black/40 p-2">
      <p className="mb-1.5 text-xs font-bold text-white/70">Table {tableNum}</p>
      <div className="grid grid-cols-2 gap-2">
        {TABLE_PHASE_OVERRIDES.map((phase) => (
          <button
            key={phase.id}
            type="button"
            onClick={() => onPick(phase.id)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            {phase.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function byAmountDesc<T extends { amount: number; atMs: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => b.amount - a.amount || b.atMs - a.atMs)
}

export function HostHandBetRank({
  bets,
  limit,
  title,
}: {
  bets: HostVenueBigBetEntry[]
  limit?: number
  title?: string
}) {
  const ranked = byAmountDesc(bets)
  const shown = typeof limit === 'number' ? ranked.slice(0, limit) : ranked
  if (shown.length === 0) return null
  return (
    <div className="mb-2">
      {title ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/45">{title}</p>
      ) : null}
      <ol className="space-y-1">
      {shown.map((bet, i) => (
        <li
          key={`${bet.tableNum}-${bet.atMs}-${bet.kind}-${bet.name}-${i}`}
          className="flex items-baseline justify-between gap-2 rounded-md border border-amber-400/30 bg-amber-950/20 px-2 py-1 text-sm"
        >
          <span className="min-w-0 truncate font-semibold text-amber-50">
            <span className="mr-1.5 font-mono text-white/40">{i + 1}</span>
            {bet.name}
            <span className="ml-1.5 font-bold uppercase tracking-wide text-amber-200/70">
              {BET_ACTION_LABEL[bet.kind] ?? bet.kind}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="mr-1.5 text-white/40">T{bet.tableNum}</span>
            <span className="font-mono font-bold tabular-nums text-amber-100">
              <ChipText text={formatHostFloorMoney(bet.amount)} />
            </span>
          </span>
        </li>
      ))}
      </ol>
    </div>
  )
}

function feltBeatTileTitle(args: {
  watching: boolean
  seated: number
  sig: string | null
  drift: boolean
  unanimous: boolean
}): string | undefined {
  if (args.watching) {
    return `Your mirrored host table (cyan ring)${args.sig ? ` — ${args.sig}` : ''}`
  }
  if (args.seated === 0) return 'Empty felt — not counted for lockstep'
  if (!args.sig) return undefined
  if (args.drift) return `Straggler — ${args.sig}`
  if (args.unanimous) return `In sync — ${args.sig}`
  return `In sync with majority — ${args.sig}`
}

function feltBeatTileClass(active: boolean, drift: boolean, watching: boolean, picked: boolean): string {
  const tone = !active
    ? 'border-white/10 bg-black/22 opacity-75'
    : drift
      ? 'border-amber-400/85 bg-amber-950/25'
      : 'border-white/20 bg-black/35'
  const watch = watching ? 'ring-1 ring-cyan-400/65' : ''
  const pick = picked ? 'ring-1 ring-amber-300/80' : ''
  return `host-felt-tile h-full min-h-[6.5rem] rounded-lg border px-2 py-1.5 text-center ${tone} ${watch} ${pick}`
}

function HostFeltBeatTileBody({
  tableNum,
  phaseLabel,
  seatedLabel,
  countdownSec,
}: {
  tableNum: number
  phaseLabel: string
  seatedLabel: string
  countdownSec: number | null
}) {
  return (
    <>
      <div className="text-xs font-bold tabular-nums text-yellow-400/90">{tableNum}</div>
      <div className="truncate text-xs font-semibold leading-tight text-white/85">{phaseLabel}</div>
      <div className="text-xs tabular-nums text-white/45">
        {seatedLabel}
        {countdownSec != null ? (
          <span
            className={`block font-mono text-2xl font-black leading-none tabular-nums ${
              countdownSec <= 10 ? 'text-rose-300' : 'text-amber-200'
            }`}
          >
            {countdownSec}
          </span>
        ) : null}
      </div>
    </>
  )
}

function HostFeltBeatTile({
  row,
  hostTableId,
  drift,
  unanimous,
  picked,
  onToggle,
}: {
  row: HostVenueFeltBeatRow
  hostTableId: string
  drift: boolean
  unanimous: boolean
  picked: boolean
  onToggle?: () => void
}) {
  const watching = hostTableId.trim() !== LOBBY_TABLE_ID && String(row.tableNum) === hostTableId.trim()
  const phaseLabel = row.phase === 'inactive' ? '—' : HOST_PHASE_LABEL[row.phase as GamePhase] ?? row.phase
  const countdownSec =
    row.phase === 'answering' && row.answerDeadlineMs != null
      ? Math.max(0, Math.ceil((row.answerDeadlineMs - Date.now()) / 1000))
      : null
  const title = feltBeatTileTitle({
    watching,
    seated: row.seated,
    sig: row.phaseStrictSig ?? null,
    drift,
    unanimous,
  })
  const className = feltBeatTileClass(row.active, drift, watching, picked)
  const body = (
    <HostFeltBeatTileBody
      tableNum={row.tableNum}
      phaseLabel={phaseLabel}
      seatedLabel={row.active ? `${row.seated}p` : '—'}
      countdownSec={countdownSec}
    />
  )
  if (onToggle == null || row.seated === 0) {
    return (
      <div title={title} className={className}>
        {body}
      </div>
    )
  }
  return (
    <button type="button" aria-label={`Table ${row.tableNum}`} title={title} onClick={onToggle} className={className}>
      {body}
    </button>
  )
}

export function HostVenueFeltBeatStrip({
  rows,
  hostTableId,
  onAlignRoom,
  onSetTablePhase,
  forceOpen = false,
}: {
  rows: HostVenueFeltBeatRow[] | null
  hostTableId: string
  onAlignRoom?: () => void
  onSetTablePhase?: (tableNum: number, signature: string) => void
  forceOpen?: boolean
}) {
  const { outlierTableNums, lockstepMisaligned, unanimousSig } = venueFeltBeatLockstep(rows)
  const seatedTableCount = rows?.filter((r) => r.active && r.seated > 0).length ?? 0
  const [openTable, setOpenTable] = useState<number | null>(null)
  const openRow =
    openTable == null ? undefined : rows?.find((row) => row.tableNum === openTable && row.seated > 0)

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
      forceOpen={forceOpen}
      appearance="button"
      buttonSummary={<span>Venue felts · beat</span>}
      badge={
        lockstepMisaligned ? (
          <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-200">
            Misaligned
          </span>
        ) : rows != null ? (
          <span className="text-xs font-normal text-white/40">{seatedTableCount} seated</span>
        ) : null
      }
      summary={
        <span>
          Venue felts · beat
        </span>
      }
    >
      {lockstepMisaligned && onAlignRoom ? (
        <div className="mb-2">
          <button
            type="button"
            onClick={onAlignRoom}
            className="rounded-md border border-amber-300/60 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-50 hover:bg-amber-500/30"
          >
            Match the room
          </button>
        </div>
      ) : null}
      {openRow && onSetTablePhase ? (
        <HostFeltPhasePicker
          tableNum={openRow.tableNum}
          onPick={(signature) => {
            onSetTablePhase(openRow.tableNum, signature)
            setOpenTable(null)
          }}
        />
      ) : null}
      {rows == null ? (
        <p className="text-sm text-white/50">Waiting for first venue sync…</p>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(6.5rem,1fr)] grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {rows.map((row) => (
            <HostFeltBeatTile
              key={row.tableNum}
              row={row}
              hostTableId={hostTableId}
              drift={row.seated > 0 && outlierTableNums.has(row.tableNum)}
              unanimous={unanimousSig != null}
              picked={openTable === row.tableNum}
              onToggle={
                onSetTablePhase == null
                  ? undefined
                  : () => setOpenTable((current) => (current === row.tableNum ? null : row.tableNum))
              }
            />
          ))}
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

/** Badge: emerald = chip pot; amber = trivia points only. */
export function HostContestBadge({
  kind,
  label,
  reason,
  title,
}: {
  kind: 'pot' | 'points'
  label: string
  reason?: string | null
  title?: string
}) {
  const pot = kind === 'pot'
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
        pot
          ? 'border-emerald-400/55 bg-emerald-950/45 text-emerald-100'
          : 'border-amber-400/50 bg-amber-950/40 text-amber-100'
      }`}
    >
      {label}
      {reason ? <span className="font-semibold normal-case tracking-normal text-white/55">· {reason}</span> : null}
    </span>
  )
}

function ContestColumn({
  title,
  empty,
  players,
  tone,
  hostPlayerLabel,
}: {
  title: string
  empty: string
  players: GameState['players']
  tone: string
  hostPlayerLabel: (name: string) => string
}) {
  return (
    <section className={`min-w-0 rounded-lg border p-2 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">
        {title}
        <span className="ml-1.5 tabular-nums text-white/45">{players.length}</span>
      </p>
      {players.length === 0 ? (
        <p className="mt-2 text-sm text-white/40">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {players.map((p) => {
            const status = hostContestStatus(p)
            const reason = hostContestReasonLabel(status)
            return (
              <li key={p.id} className="rounded-md bg-black/30 px-2 py-1.5" title={status.detail}>
                <p className="text-sm font-semibold leading-tight text-white">{hostPlayerLabel(p.name)}</p>
                {reason ? <p className="text-xs text-white/55">{reason}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Bound-table roster: who is still in for chips vs trivia points only. */
export function HostContestRoster({
  gameState,
  hostPlayerLabel,
}: {
  gameState: GameState
  hostPlayerLabel: (name: string) => string
}) {
  const phase = gameState.phase
  if (
    phase !== 'betting' &&
    phase !== 'answering' &&
    phase !== 'showdown' &&
    phase !== 'reveal' &&
    phase !== 'payout'
  ) {
    return null
  }
  if (gameState.players.length === 0) return null

  const potPlayers = gameState.players.filter((p) => hostContestStatus(p).kind === 'pot')
  const pointsPlayers = gameState.players.filter((p) => hostContestStatus(p).kind !== 'pot')

  return (
    <div aria-label="Player contest status">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-white/45">Contest status</p>
      <div className="grid grid-cols-2 gap-2">
        <ContestColumn
          title="In pot"
          empty="Nobody in the pot."
          players={potPlayers}
          tone="border-emerald-400/35 bg-emerald-950/20"
          hostPlayerLabel={hostPlayerLabel}
        />
        <ContestColumn
          title="Points only"
          empty="Everyone is still in."
          players={pointsPlayers}
          tone="border-amber-400/30 bg-amber-950/15"
          hostPlayerLabel={hostPlayerLabel}
        />
      </div>
    </div>
  )
}

function formatMoveLogClock(atMs: number): string {
  try {
    return new Date(atMs).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

/** Live chronological log of every player move across all tables. */
export function HostVenueMoveLogPanel({
  brief,
  hostPlayerLabel,
  forceOpen = false,
}: {
  brief: HostVenueFloorBriefPayload | null
  hostPlayerLabel: (name: string) => string
  /** Auto-expand when tables are out of sync. */
  forceOpen?: boolean
}) {
  const moves = brief?.moveLog ?? []
  const [tableFilter, setTableFilter] = useState<number | 'all'>('all')
  const tableNums = Array.from(new Set(moves.map((m) => m.tableNum))).sort((a, b) => a - b)
  const filtered =
    tableFilter === 'all' ? moves : moves.filter((m) => m.tableNum === tableFilter)

  return (
    <HostCollapsible
      defaultOpen={false}
      forceOpen={forceOpen}
      className="mb-3"
      badge={
        <span className="text-xs font-normal tabular-nums text-white/40">
          {moves.length} move{moves.length === 1 ? '' : 's'}
        </span>
      }
      summary={
        <span>
          Player actions
          <span className="ml-1.5 hidden font-normal text-white/45 sm:inline">
            — bets, folds, and guesses as they happen
          </span>
        </span>
      }
    >
      {brief == null ? (
        <p className="text-sm text-white/50">Waiting for venue sync…</p>
      ) : (
        <>
          {tableNums.length > 1 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setTableFilter('all')}
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  tableFilter === 'all'
                    ? 'border-casino-emerald/50 bg-casino-emerald/15 text-emerald-100'
                    : 'border-white/15 bg-black/30 text-white/55 hover:border-white/30'
                }`}
              >
                All tables
              </button>
              {tableNums.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTableFilter(n)}
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    tableFilter === n
                      ? 'border-casino-emerald/50 bg-casino-emerald/15 text-emerald-100'
                      : 'border-white/15 bg-black/30 text-white/55 hover:border-white/30'
                  }`}
                >
                  T{n}
                </button>
              ))}
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <p className="text-sm text-white/50">
              No player moves yet — they appear here as soon as someone acts.
            </p>
          ) : (
            <ul className="max-h-[min(40vh,22rem)] space-y-1 overflow-y-auto overscroll-contain pr-1">
              {filtered.map((m: HostVenueMoveLogEntry) => (
                <li
                  key={m.id}
                  className="flex items-baseline gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs"
                >
                  <span className="shrink-0 font-mono tabular-nums text-white/35">
                    {formatMoveLogClock(m.atMs)}
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-yellow-300/90">T{m.tableNum}</span>
                  <span className="min-w-0 flex-1 font-semibold text-white/85">
                    <ChipText text={relabelMoveSummary(m, hostPlayerLabel)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </HostCollapsible>
  )
}

function relabelMoveSummary(
  m: HostVenueMoveLogEntry,
  hostPlayerLabel: (name: string) => string,
): string {
  const labeled = hostPlayerLabel(m.playerName)
  if (!m.playerName || labeled === m.playerName) return m.summary
  if (m.summary.startsWith(m.playerName)) {
    return `${labeled}${m.summary.slice(m.playerName.length)}`
  }
  return m.summary
}

function seatReasonLabel(reason: HostVenueSeatContest['reason']): string | null {
  if (reason === 'folded') return 'Folded'
  if (reason === 'busted') return 'Busted'
  return null
}

type HostTablePlayerRef = { playerId: string; name: string }

type ContestRow = { seat: HostVenueSeatContest; player: HostTablePlayerRef | null }

type SeatActionBag = {
  tableNum: number
  toTable: number
  onToTable: (tableNum: number) => void
  armedId: string | null
  onArm: (playerId: string | null) => void
  onMove?: (playerId: string, toTableNum: number) => void
  onRemove?: (playerId: string) => void
}

function playerMatchesSeat(
  player: HostTablePlayerRef,
  seatName: string,
  hostPlayerLabel: (name: string) => string,
): boolean {
  const rawSeat = seatName.trim().toLowerCase()
  const labeledSeat = hostPlayerLabel(seatName).trim().toLowerCase()
  const rawPlayer = player.name.trim().toLowerCase()
  const labeledPlayer = hostPlayerLabel(player.name).trim().toLowerCase()
  return (
    rawPlayer === rawSeat ||
    labeledPlayer === labeledSeat ||
    rawPlayer === labeledSeat ||
    labeledPlayer === rawSeat
  )
}

function takeMatchingPlayer(
  seatName: string,
  unused: HostTablePlayerRef[],
  hostPlayerLabel: (name: string) => string,
): HostTablePlayerRef | null {
  const index = unused.findIndex((player) => playerMatchesSeat(player, seatName, hostPlayerLabel))
  if (index < 0) return null
  const [matched] = unused.splice(index, 1)
  return matched ?? null
}

/** Pair each contest seat with a roster id. Roster players the felt omitted stay in the pot column. */
function contestRows(
  seats: HostVenueSeatContest[],
  players: HostTablePlayerRef[],
  hostPlayerLabel: (name: string) => string,
): { pot: ContestRow[]; points: ContestRow[] } {
  const unused = [...players]
  const pot: ContestRow[] = []
  const points: ContestRow[] = []
  for (const seat of seats) {
    const row = { seat, player: takeMatchingPlayer(seat.name, unused, hostPlayerLabel) }
    if (seat.kind === 'pot') pot.push(row)
    else points.push(row)
  }
  for (const player of unused) {
    pot.push({ seat: { name: player.name, kind: 'pot', reason: null }, player })
  }
  return { pot, points }
}

function SeatMoveControls({
  player,
  actions,
}: {
  player: HostTablePlayerRef
  actions: SeatActionBag
}) {
  const armed = actions.armedId === player.playerId
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {actions.onMove ? (
        <>
          <select
            aria-label={`Move ${player.name} to`}
            value={actions.toTable}
            onChange={(e) => actions.onToTable(Number(e.target.value))}
            className="rounded-md border border-white/20 bg-zinc-950 py-1 pl-2 pr-6 text-sm text-white [color-scheme:dark]"
          >
            {Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, index) => index + 1).map((n) => (
              <option key={n} value={n}>
                Table {n}
              </option>
            ))}
          </select>
          <NeonButton
            variant="blue"
            size="small"
            type="button"
            disabled={actions.toTable === actions.tableNum}
            onClick={() => actions.onMove?.(player.playerId, actions.toTable)}
          >
            Move
          </NeonButton>
        </>
      ) : null}
      {actions.onRemove ? (
        <NeonButton
          variant="red"
          size="small"
          type="button"
          onClick={() => {
            if (!armed) {
              actions.onArm(player.playerId)
              return
            }
            actions.onRemove?.(player.playerId)
            actions.onArm(null)
          }}
        >
          {armed ? 'Remove them' : 'Remove'}
        </NeonButton>
      ) : null}
    </div>
  )
}

function SeatContestRow({
  row,
  hostPlayerLabel,
  actions,
}: {
  row: ContestRow
  hostPlayerLabel: (name: string) => string
  actions: SeatActionBag | null
}) {
  const reason = seatReasonLabel(row.seat.reason)
  return (
    <li className="rounded-md bg-black/30 px-2 py-1.5">
      <p className="text-sm font-semibold leading-tight text-white">{hostPlayerLabel(row.seat.name)}</p>
      {reason ? <p className="text-xs text-white/55">{reason}</p> : null}
      {row.player && actions ? <SeatMoveControls player={row.player} actions={actions} /> : null}
    </li>
  )
}

function SeatContestColumn({
  title,
  empty,
  rows,
  tone,
  hostPlayerLabel,
  actions,
}: {
  title: string
  empty: string
  rows: ContestRow[]
  tone: string
  hostPlayerLabel: (name: string) => string
  actions: SeatActionBag | null
}) {
  return (
    <section className={`min-w-0 rounded-lg border p-2 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">
        {title}
        <span className="ml-1.5 tabular-nums text-white/45">{rows.length}</span>
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-white/40">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((row, index) => (
            <SeatContestRow
              key={row.player?.playerId ?? `${row.seat.name}-${index}`}
              row={row}
              hostPlayerLabel={hostPlayerLabel}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/** In-pot and points-only players for one opened table. */
export function HostTableContest({
  seats,
  hostPlayerLabel,
  tableNum,
  players = [],
  onMove,
  onRemove,
}: {
  seats: HostVenueSeatContest[]
  hostPlayerLabel: (name: string) => string
  tableNum?: number
  players?: HostTablePlayerRef[]
  onMove?: (playerId: string, toTableNum: number) => void
  onRemove?: (playerId: string) => void
}) {
  const [toTable, setToTable] = useState(tableNum === 1 ? 2 : 1)
  const [armedId, setArmedId] = useState<string | null>(null)
  const { pot, points } = contestRows(seats, players, hostPlayerLabel)
  const actions: SeatActionBag | null =
    onMove == null && onRemove == null
      ? null
      : {
          tableNum: tableNum ?? 0,
          toTable,
          onToTable: setToTable,
          armedId,
          onArm: setArmedId,
          onMove,
          onRemove,
        }
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Player contest status">
      <SeatContestColumn
        title="In pot"
        empty="Nobody in the pot."
        rows={pot}
        tone="border-emerald-400/35 bg-emerald-950/20"
        hostPlayerLabel={hostPlayerLabel}
        actions={actions}
      />
      <SeatContestColumn
        title="Points only"
        empty="Everyone is still in."
        rows={points}
        tone="border-amber-400/30 bg-amber-950/15"
        hostPlayerLabel={hostPlayerLabel}
        actions={actions}
      />
    </div>
  )
}

function recentActionLabel(action: string): string {
  if (action === 'fold') return 'Fold · points'
  return BET_ACTION_LABEL[action] ?? action
}

/** Contest columns plus this table's recent actions. */
export function HostTableOpen({
  seats,
  recentActions,
  hostPlayerLabel,
  phaseLabel,
  pot = 0,
  actingSummary,
  tableNum,
  players,
  onMove,
  onRemove,
  onSetTablePhase,
  onSpotlight,
}: {
  seats: HostVenueSeatContest[]
  recentActions: HostVenueRecentAction[]
  hostPlayerLabel: (name: string) => string
  phaseLabel?: string
  pot?: number
  actingSummary?: string | null
  tableNum?: number
  players?: HostTablePlayerRef[]
  onMove?: (playerId: string, toTableNum: number) => void
  onRemove?: (playerId: string) => void
  onSetTablePhase?: (signature: string) => void
  onSpotlight?: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {phaseLabel || pot > 0 || actingSummary ? (
        <p className="text-sm text-white/70">
          {phaseLabel}
          {pot > 0 ? (
            <>
              {phaseLabel ? ' · pot ' : 'Pot '}
              <ChipText text={formatHostFloorMoney(pot)} />
            </>
          ) : null}
          {actingSummary ? (
            <span className="mt-0.5 block font-semibold text-amber-100/90">
              <ChipText text={actingSummary} />
            </span>
          ) : null}
        </p>
      ) : null}
      <HostTableContest
        seats={seats}
        hostPlayerLabel={hostPlayerLabel}
        tableNum={tableNum}
        players={players}
        onMove={onMove}
        onRemove={onRemove}
      />
      {recentActions.length > 0 ? (
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">Recent actions</p>
          <ul className="mt-2 space-y-1">
            {recentActions.map((action, index) => (
              <li
                key={`${action.seat}-${index}`}
                className="flex items-baseline justify-between gap-2 rounded-md bg-black/30 px-2 py-1.5 text-sm"
              >
                <span className="font-semibold text-white">{hostPlayerLabel(action.name)}</span>
                <span className="shrink-0 text-xs text-white/55">{recentActionLabel(action.action)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {tableNum != null && onSetTablePhase ? (
        <HostFeltPhasePicker tableNum={tableNum} onPick={onSetTablePhase} />
      ) : null}
      {onSpotlight ? (
        <NeonButton variant="gold" size="small" type="button" onClick={onSpotlight}>
          Show on TVs
        </NeonButton>
      ) : null}
    </div>
  )
}

/** The table filling the public screens by itself, or null while other tables or another mode share the wall. */
export function publicDisplaySoloTable(brief: HostVenueFloorBriefPayload | null): number | null {
  if (brief == null) return null
  if ((brief.wallView ?? 'floor') !== 'floor') return null
  if (brief.liveTableCount !== 1) return null
  const live = brief.actionRows.filter((row) => row.seated > 0)
  return live.length === 1 ? live[0].tableNum : null
}

export function HostVenueFloorBriefPanel({
  brief,
  hostPlayerLabel,
  feltRows = null,
  onAlignRoom,
  onSetTablePhase,
  onSpotlight,
  onMove,
  onRemove,
  onNudgeTable,
  blindCall,
}: {
  brief: HostVenueFloorBriefPayload | null
  hostPlayerLabel: (name: string) => string
  hostTableId: string
  feltRows?: HostVenueFeltBeatRow[] | null
  onAlignRoom?: () => void
  onSetTablePhase?: (tableNum: number, signature: string) => void
  onSpotlight?: (tableNum: number) => void
  onMove?: (playerId: string, toTableNum: number) => void
  onRemove?: (playerId: string) => void
  /** Start the 30s clock for the human waiting to act at this table. */
  onNudgeTable?: (tableNum: number) => void
  blindCall?: ReactNode
}) {
  const rows = [...(brief?.actionRows ?? [])].sort((a, b) => a.tableNum - b.tableNum)
  const soloTable = publicDisplaySoloTable(brief)
  const { outlierTableNums, lockstepMisaligned } = venueFeltBeatLockstep(feltRows)
  const [openTable, setOpenTable] = useState<number | null>(null)
  const openRow = rows.find((row) => row.tableNum === openTable)

  return (
    <>
    <HostCollapsible
      expanded
      toolbar={
        blindCall ? <div className="host-floor-toolbar">{blindCall}</div> : undefined
      }
      badge={
        brief != null ? (
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal text-white/40">
              {brief.liveTableCount} tables · {brief.fieldPlayerCount} in field
            </span>
            {lockstepMisaligned ? (
              <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-200">
                Misaligned
              </span>
            ) : null}
          </span>
        ) : null
      }
      summary={
        <span>
          Venue floor · now
        </span>
      }
    >
      {brief == null ? (
        <p className="text-sm text-white/50">Waiting for venue sync…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            {lockstepMisaligned && onAlignRoom ? (
              <button
                type="button"
                onClick={onAlignRoom}
                className="mb-2 rounded-md border border-amber-300/60 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-50 hover:bg-amber-500/30"
              >
                Match the room
              </button>
            ) : null}
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
              Table action
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-white/50">No seated tables yet.</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,9rem))] justify-start gap-1.5">
                {rows.map((row) => {
                  const onPublicDisplay = soloTable === row.tableNum
                  const cue = tableActionCue(row)
                  const drift = outlierTableNums.has(row.tableNum)
                  const nudgeName = onNudgeTable ? actingNudgeName(row) : null
                  return (
                    <li key={row.tableNum}>
                    <button
                      type="button"
                      aria-label={`Open table ${row.tableNum}`}
                      onClick={() => setOpenTable(row.tableNum)}
                      className={`w-full cursor-pointer rounded-md border px-1.5 py-1 text-left ${cue.tone} ${
                        drift || row.interestingAction ? 'ring-1 ring-amber-300/70' : ''
                      } ${onPublicDisplay ? 'ring-1 ring-sky-300/70' : ''}`}
                    >
                      <span className="text-base font-bold text-white/90">
                        T{row.tableNum}
                        {onPublicDisplay ? (
                          <span className="ml-1.5 text-sm font-semibold uppercase text-sky-200">
                            Focus
                          </span>
                        ) : null}
                      </span>
                      <p className="text-sm font-semibold">{cue.label}</p>
                      {nudgeName ? (
                        <p className="truncate text-sm font-semibold text-amber-50">
                          {hostPlayerLabel(nudgeName)}
                        </p>
                      ) : null}
                      <p className="text-sm tabular-nums text-white/50">
                        <span className="font-semibold text-emerald-200/85">
                          {row.inPotCount ?? 0} in pot
                        </span>
                        {(row.pointsOnlyCount ?? 0) > 0 ? (
                          <span className="font-semibold text-amber-200/85">
                            {' · '}
                            {row.pointsOnlyCount} out
                          </span>
                        ) : null}
                      </p>
                    </button>
                    {nudgeName ? (
                      <button
                        type="button"
                        aria-label={`Nudge ${nudgeName} on table ${row.tableNum}`}
                        onClick={() => onNudgeTable?.(row.tableNum)}
                        className="mt-1 w-full rounded border border-amber-300/70 bg-amber-500/25 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-50"
                      >
                        Nudge
                      </button>
                    ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
            <HostModal
              title={openRow ? `Table ${openRow.tableNum}` : 'Table'}
              open={openRow != null}
              onClose={() => setOpenTable(null)}
            >
              {openRow ? (
                <HostTableOpen
                  seats={openRow.seats ?? []}
                  recentActions={openRow.recentActions}
                  phaseLabel={tableActionCue(openRow).label}
                  pot={openRow.pot}
                  actingSummary={openRow.actingSummary}
                  tableNum={openRow.tableNum}
                  onSetTablePhase={
                    onSetTablePhase
                      ? (signature) => onSetTablePhase(openRow.tableNum, signature)
                      : undefined
                  }
                  onSpotlight={onSpotlight ? () => onSpotlight(openRow.tableNum) : undefined}
                  players={(brief?.roster ?? [])
                    .filter((seat) => seat.tableNum === openRow.tableNum)
                    .map((seat) => ({ playerId: seat.playerId, name: seat.name }))}
                  onMove={onMove}
                  onRemove={onRemove}
                  hostPlayerLabel={hostPlayerLabel}
                />
              ) : null}
            </HostModal>
          </div>
        </div>
      )}
    </HostCollapsible>
    <div className="mt-2">
    <HostCollapsible
      expanded
      summary={
        <span>
          This hand
        </span>
      }
    >
      {brief == null ? (
        <p className="text-sm text-white/50">Waiting for venue sync…</p>
      ) : (
          <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
              Busts
            </p>
            {brief.busts.length === 0 ? (
              <p className="text-base text-white/50">None this hand.</p>
            ) : (
              <ul className="space-y-1">
                {brief.busts.map((b, i) => (
                  <li
                    key={`${b.name}-${b.tableNum}-${b.atMs}-${i}`}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-red-400/25 bg-red-950/20 px-2 py-1.5 text-sm"
                  >
                    <span className="font-semibold text-red-100">{hostPlayerLabel(b.name)}</span>
                    <span className="shrink-0 text-white/45">T{b.tableNum}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
              Big bets this hand
            </p>
            {(brief.handBets ?? []).length === 0 ? (
              <p className="text-base text-white/50">None this hand.</p>
            ) : (
              <HostHandBetRank bets={brief.handBets ?? []} />
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
              Big wins
              <span className="ml-1 font-normal normal-case text-white/35">
                (≥ <ChipText text={formatHostFloorMoney(brief.bigWinMinAmount)} />)
              </span>
            </p>
            {brief.bigWinners.length === 0 ? (
              <p className="text-base text-white/50">None yet this session.</p>
            ) : (
              <ul className="space-y-1">
                {byAmountDesc(brief.bigWinners).map((w, i) => (
                  <li
                    key={`${w.name}-${w.tableNum}-${w.atMs}-${i}`}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-emerald-400/30 bg-emerald-950/20 px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold text-emerald-100">
                      {hostPlayerLabel(w.name)}
                    </span>
                    <span className="shrink-0 font-mono font-bold tabular-nums text-emerald-200">
                      +<ChipText text={formatHostFloorMoney(w.amount)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </div>
      )}
    </HostCollapsible>
    </div>
    </>
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
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums ${
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
  onSeatingRules,
  onSpotlight,
}: {
  venueCode: string
  tableMax: number
  livelyTableNums: number[]
  onVenueFloor: () => void
  onLeaderboard: () => void
  onSeatingRules: () => void
  onSpotlight: (n: number) => void
}) {
  return (
    <HostCollapsible summary="Public TVs & routing" className="mb-4">
      <p className="mb-3 text-xs leading-snug text-white/50">
        Pair displays in Setup below (venue{' '}
        <span className="font-mono text-white/65">{venueCode}</span>). Switch TVs between the{' '}
        <strong className="text-white/70">venue floor</strong>, a full-screen{' '}
        <strong className="text-white/70">leaderboard</strong>,{' '}
        <strong className="text-white/70">seating rules</strong>, or highlight one table.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <NeonButton variant="emerald" size="small" onClick={onVenueFloor}>
          Venue floor
        </NeonButton>
        <NeonButton variant="purple" size="small" onClick={onLeaderboard}>
          Leaderboard
        </NeonButton>
        <NeonButton variant="gold" size="small" onClick={onSeatingRules}>
          Seating rules
        </NeonButton>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-white/35">Highlight</span>
        {Array.from({ length: Math.min(20, tableMax) }, (_, i) => i + 1).map((n) => {
          const lively = livelyTableNums.includes(n)
          return (
            <NeonButton
              key={n}
              variant="gold"
              size="small"
              className={`!min-w-[2.75rem] ${lively ? 'ring-2 ring-amber-400/70' : ''}`}
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
          Venue blinds: <span className="font-semibold tabular-nums text-amber-50"><ChipText text={blindLevelSummary} /></span>
        </p>
      ) : null}
      <div className={`flex flex-wrap items-end gap-2 ${compact ? '' : 'md:grid md:grid-cols-3 md:items-end md:gap-3'}`}>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/48">Small blind</label>
          <input
            type="number"
            min={1}
            value={venueSmallBlind}
            onChange={(e) => onVenueSmallBlindChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/48">Big blind</label>
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
          <label className="text-xs font-semibold uppercase tracking-wide text-white/48">
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
          <p className="w-full text-xs font-semibold uppercase tracking-wide text-white/48">
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

const RUN_STEP_SHORT: Partial<Record<RunOfShowStepId, string>> = {
  assign: 'Seat',
  start: 'Deal',
  question: 'Ask',
  'close-bet-1': 'Bet 1',
  'deal-board': 'Cards',
  'close-bet-2': 'Bet 2',
  'start-answer': 'Guess',
  reveal: 'Reveal',
  'end-round': 'Pay',
}

/** Public display modes as separate buttons. The mode on the TVs stays highlighted. */
export function HostTvBar({
  activeView = 'floor',
  onVenueFloor,
  onLeaderboard,
  onTriviaLeaderboard,
  onSeatingChart,
  onEliminations,
  onSeatingRules,
}: {
  activeView?: VenueWallViewMode
  onVenueFloor: () => void
  onLeaderboard: () => void
  onTriviaLeaderboard?: () => void
  onSeatingChart?: () => void
  onEliminations?: () => void
  onSeatingRules: () => void
  /** @deprecated Spotlight via HostFloorStrip — ignored. */
  livelyTableNums?: number[]
  tableMax?: number
  onSpotlight?: (n: number) => void
}) {
  const modes: Array<{ id: VenueWallViewMode; label: string; onClick: () => void }> = [
    { id: 'floor', label: 'Tables', onClick: onVenueFloor },
    { id: 'leaderboard', label: 'Chip scores', onClick: onLeaderboard },
  ]
  if (onTriviaLeaderboard) {
    modes.push({ id: 'leaderboard-trivia', label: 'Trivia scores', onClick: onTriviaLeaderboard })
  }
  if (onSeatingChart) {
    modes.push({ id: 'seating-chart', label: 'Seating', onClick: onSeatingChart })
  }
  if (onEliminations) {
    modes.push({ id: 'busts', label: 'Eliminations', onClick: onEliminations })
  }
  modes.push({ id: 'rules', label: 'How to play', onClick: onSeatingRules })

  return (
    <div className="host-tv-modes w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/45">Public display</p>
      <div className="flex flex-wrap items-center justify-end gap-1.5" role="group" aria-label="Public display">
      {modes.map((m) => {
        const active = m.id === activeView
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={active}
            onClick={m.onClick}
            className={
              active
                ? 'host-tv-mode-active min-h-11 shrink-0 rounded-xl border border-sky-300 bg-sky-900/80 px-3 py-2 text-sm font-bold text-white'
                : 'min-h-11 shrink-0 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white'
            }
          >
            {m.label}
          </button>
        )
      })}
      </div>
    </div>
  )
}

/** Question and answer for the host desk. The answer stays off player phones until Reveal. */
export function HostLiveQuestionCard({ text, answer }: { text: string; answer: number }) {
  return (
    <section
      className="host-lower-third overflow-y-auto rounded-xl border border-amber-400/40 px-4 py-3"
      aria-label="Live question"
    >
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-white/45">Question</p>
      <p className="mt-1 whitespace-pre-wrap text-2xl font-semibold leading-snug text-white">{text}</p>
      <p className="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-casino-gold/80">Answer</p>
      <p className="mt-0.5 text-4xl font-extrabold tabular-nums text-casino-gold">
        {formatTriviaNumber(answer)}
      </p>
    </section>
  )
}

/** Sticky run bar: headline, status, one primary cue + quiet secondaries, TV routing. */
export function HostRunBar({
  items,
  statusLine,
  headline,
  tvBar,
  pacingUrgency = 'ready',
  cueHint,
}: {
  items: HostDockItem[]
  statusLine?: ReactNode
  headline?: { title: string; detail?: string }
  tvBar?: ReactNode
  pacingUrgency?: 'now' | 'soon' | 'ready'
  /** Shown under the primary button when gated / blocked. */
  cueHint?: string | null
}) {
  if (items.length === 0 && !statusLine && !headline && !tvBar) return null
  const waitingOnly = items.length === 0 && headline?.title?.toLowerCase().includes('waiting')
  const urgencyLabel = 'Next'
  const urgencyClass = waitingOnly
    ? 'text-sky-300'
    : pacingUrgency === 'now'
      ? 'text-amber-300'
      : pacingUrgency === 'soon'
        ? 'text-sky-300'
        : 'text-casino-emerald/90'

  const primary = items.find((i) => i.role === 'primary') ?? items[0] ?? null
  const rest = items.filter((i) => i !== primary)
  const quiet = rest.filter((i) => i.role !== 'danger')
  const danger = rest.filter((i) => i.role === 'danger')

  return (
    <div
      className="host-next-band rounded-xl border border-casino-emerald/40 p-3 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur-md"
      data-urgency={waitingOnly ? 'waiting' : pacingUrgency}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          {headline || statusLine ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              {headline ? (
                <div className="min-w-0">
                  <p className={`host-next-kicker text-xs font-bold uppercase tracking-[0.14em] ${urgencyClass}`}>
                    {urgencyLabel}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold leading-snug text-white">{headline.title}</p>
                  {headline.detail ? (
                    <p className="mt-0.5 text-sm leading-snug text-white/55">
                      <ChipText text={headline.detail} />
                    </p>
                  ) : null}
                </div>
              ) : null}
              {statusLine ? <div className="shrink-0">{statusLine}</div> : null}
            </div>
          ) : null}
          {primary || quiet.length > 0 || danger.length > 0 ? (
            <div className={headline || statusLine ? 'mt-2' : undefined}>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show cues">
                {primary ? (
                  <NeonButton
                    key={primary.id}
                    variant={primary.variant}
                    size="normal"
                    disabled={primary.disabled}
                    onClick={primary.onClick}
                    className="host-cue-primary !px-5 !py-2 !text-lg !font-bold"
                  >
                    {primary.label}
                  </NeonButton>
                ) : null}
                {quiet.map((item) => (
                  <NeonButton
                    key={item.id}
                    variant={item.variant}
                    size="small"
                    disabled={item.disabled}
                    onClick={item.onClick}
                    className="host-cue-quiet !px-3 !py-2 !text-sm !font-semibold"
                  >
                    {item.label}
                  </NeonButton>
                ))}
                {danger.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={item.onClick}
                    className="rounded-md border border-rose-400/40 bg-rose-950/40 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-100/90 hover:bg-rose-900/50 disabled:opacity-40"
                    title="Fold the player who should act"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {cueHint ? <p className="mt-1 text-xs font-medium text-amber-200/90">{cueHint}</p> : null}
            </div>
          ) : null}
        </div>
        {tvBar ? <div className="min-w-0 lg:max-w-[46%] lg:shrink-0">{tvBar}</div> : null}
      </div>
    </div>
  )
}

export function soonestAnswerSeconds(
  rows: readonly HostVenueFeltBeatRow[] | null,
  nowMs: number,
): number | null {
  let soonest: number | null = null
  for (const row of rows ?? []) {
    if (!row.active || row.seated < 1 || row.phase !== 'answering' || row.answerDeadlineMs == null) continue
    const sec = Math.max(0, Math.ceil((row.answerDeadlineMs - nowMs) / 1000))
    soonest = soonest == null ? sec : Math.min(soonest, sec)
  }
  return soonest
}

/** Live guessing countdown. Stays on the desk while the other table controls sit in a popup. */
export function HostAnswerClock({ rows }: { rows: readonly HostVenueFeltBeatRow[] | null }) {
  const [, setTick] = useState(0)
  const soonest = soonestAnswerSeconds(rows, Date.now())
  useEffect(() => {
    if (soonest == null) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [soonest])
  if (soonest == null) return null
  const urgent = soonest <= 10
  return (
    <div
      className={`flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 ${
        urgent
          ? 'border-rose-400/75 bg-rose-950/45'
          : 'border-amber-300/75 bg-amber-950/45'
      }`}
      aria-live="polite"
      aria-label={`${soonest} seconds left on the answer clock`}
    >
      <span className="text-center text-[0.65rem] font-bold uppercase leading-tight tracking-[0.12em] text-amber-100/85">
        Answer clock
      </span>
      <span
        className={`font-mono text-4xl font-black leading-none tabular-nums ${
          urgent ? 'text-rose-200' : 'text-amber-200'
        }`}
      >
        {soonest}
      </span>
    </div>
  )
}

/** Compact horizontal floor awareness — tap a table to spotlight it on TVs. */
export function HostFloorStrip({
  rows,
  brief,
  onSpotlight,
  blindCall,
}: {
  rows: HostVenueFeltBeatRow[] | null
  brief: HostVenueFloorBriefPayload | null
  onSpotlight: (tableNum: number) => void
  blindCall?: ReactNode
}) {
  const { outlierTableNums, lockstepMisaligned } = venueFeltBeatLockstep(rows)
  const actionByTable = new Map((brief?.actionRows ?? []).map((r) => [r.tableNum, r]))
  const seated =
    rows?.filter((r) => r.active && r.seated > 0).sort((a, b) => a.tableNum - b.tableNum) ?? []
  const hasLiveCountdown =
    rows?.some((r) => r.phase === 'answering' && r.answerDeadlineMs != null) ?? false
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!hasLiveCountdown) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [hasLiveCountdown])

  if (rows == null && brief == null) return null

  return (
    <div className="host-instrument flex h-full min-h-0 flex-col overflow-y-auto rounded-xl border border-white/10 px-3 py-2 sm:px-4">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">
          Tables
          {brief != null ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-white/35">
              {brief.liveTableCount} live · {brief.fieldPlayerCount} players
            </span>
          ) : null}
        </p>
        {lockstepMisaligned ? (
          <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-200">
            Tables out of sync
          </span>
        ) : seated.length >= 2 ? (
          <span className="text-xs font-semibold text-emerald-300/80">In sync</span>
        ) : null}
      </div>
      {blindCall}
      <HostHandBetRank bets={brief?.handBets ?? []} limit={4} title="Big bets this hand" />
      {seated.length === 0 ? (
        <p className="text-sm text-white/50">No tables yet.</p>
      ) : (
        <>
        <HostAnswerClock rows={seated} />
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(5.5rem,1fr)] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {seated.map((row) => {
            const action = actionByTable.get(row.tableNum)
            const drift = outlierTableNums.has(row.tableNum)
            const phaseLabel = HOST_PHASE_LABEL[row.phase as GamePhase] ?? row.phase
            const countdownSec =
              row.phase === 'answering' && row.answerDeadlineMs != null
                ? Math.max(0, Math.ceil((row.answerDeadlineMs - Date.now()) / 1000))
                : null
            return (
              <button
                key={row.tableNum}
                type="button"
                onClick={() => onSpotlight(row.tableNum)}
                className={`h-full min-h-[5.5rem] rounded-lg border px-3 py-2 text-left transition-colors hover:border-casino-emerald/50 hover:bg-emerald-950/20 ${
                  action?.interestingAction
                    ? 'border-amber-400/55 bg-amber-950/30'
                    : drift
                      ? 'border-amber-400/70 bg-amber-950/25'
                      : 'border-white/15 bg-black/35'
                }`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-black tabular-nums text-yellow-300/95">T{row.tableNum}</span>
                  <span className="text-xs font-semibold text-white/75">{phaseLabel}</span>
                  {countdownSec != null ? (
                    <span
                      className={`font-mono text-2xl font-black leading-none tabular-nums ${
                        countdownSec <= 10 ? 'text-rose-300' : 'text-amber-200'
                      }`}
                    >
                      {countdownSec}
                    </span>
                  ) : null}
                </div>
                {action?.actingSummary ? (
                  <p className="mt-0.5 text-sm font-medium text-amber-100/85">
                    <ChipText text={action.actingSummary} />
                  </p>
                ) : action != null && action.pot > 0 ? (
                  <p className="mt-0.5 text-xs text-white/45">
                    Pot <ChipText text={formatHostFloorMoney(action.pot)} />
                  </p>
                ) : null}
              </button>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}

/** Slim round progress — dots instead of a full duplicate checklist. */
export function HostRunProgressDots({ steps }: { steps: RunOfShowStep[] }) {
  const visible = steps.filter((s) => s.state !== 'skipped')
  const current = visible.find((s) => s.state === 'current')
  if (visible.length === 0) return null

  return (
    <div className="mb-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1" aria-label="Round progress">
        {visible.map((step, i) => {
          const short = RUN_STEP_SHORT[step.id as RunOfShowStepId] ?? step.label.split(' ')[0]
          const isCurrent = step.state === 'current'
          const isDone = step.state === 'done'
          return (
            <li key={step.id} className="flex items-center gap-1">
              {i > 0 ? <span className="text-white/15" aria-hidden>›</span> : null}
              <span
                className={`rounded-md px-2 py-1 text-sm font-bold uppercase tracking-wide ${
                  isCurrent
                    ? 'bg-casino-emerald text-black shadow-[0_0_12px_rgba(0,255,180,0.35)]'
                    : isDone
                      ? 'text-casino-emerald/75'
                      : 'text-white/30'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isDone ? '✓ ' : ''}
                {short}
              </span>
            </li>
          )
        })}
      </ol>
      {current ? (
        <p className="mt-1.5 text-xs leading-snug text-white/50">
          <span className="font-semibold text-white/70">{current.label}</span>
          {' — '}
          {current.hint}
        </p>
      ) : null}
    </div>
  )
}

/** Context for the current hand only — no duplicate primary CTAs. */
export function HostThisHandPanel({
  show,
  title = 'Right now',
  children,
}: {
  show: boolean
  title?: string
  children?: ReactNode
}) {
  if (!show || !children) return null
  let hasContent = false
  Children.forEach(children, (child) => {
    if (child != null && child !== false) hasContent = true
  })
  if (!hasContent) return null
  return (
    <div className="host-instrument overflow-hidden rounded-xl border border-white/10 px-3 py-2">
      <p className="mb-1 text-sm font-bold uppercase tracking-[0.12em] text-white/40">{title}</p>
      <div className="max-h-[min(46vh,22rem)] space-y-2 overflow-y-auto">{children}</div>
    </div>
  )
}

/** Backstage: diagnostics, rehearsal, overrides — off the live scroll path. */
export function HostAdvancedPanel({
  summary = 'More tools — practice bots, blinds, emergency overrides',
  defaultOpen = false,
  children,
}: {
  summary?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <HostCollapsible summary={summary} defaultOpen={defaultOpen} className="mb-4">
      <div className="space-y-4">{children}</div>
    </HostCollapsible>
  )
}
