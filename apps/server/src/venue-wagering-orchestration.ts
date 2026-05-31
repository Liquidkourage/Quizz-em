import type { GameState } from '@qhe/core'

/** Grace period after the last table closes post-board wagering before venue-wide showdown. */
export const VENUE_POST_BOARD_SHOWDOWN_GRACE_MS = 45_000

export function isPostBoardWageringStreet(gs: GameState): boolean {
  if (gs.players.length === 0) return false
  if (gs.phase !== 'betting') return false
  if (gs.round.bettingRound !== 2) return false
  return (gs.round.communityCards?.length ?? 0) >= 5
}

export function isPostBoardWageringClosed(gs: GameState): boolean {
  return isPostBoardWageringStreet(gs) && gs.round.isBettingOpen !== true
}

export function tablePastPostBoardWagering(gs: GameState): boolean {
  if (gs.players.length === 0) return false
  const ph = gs.phase
  if (ph === 'answering' || ph === 'showdown' || ph === 'reveal' || ph === 'payout') return true
  return isPostBoardWageringClosed(gs)
}

export function venueInPostBoardAnswerWave(
  seatedTableKeys: string[],
  getState: (sessionKey: string) => GameState | undefined
): boolean {
  return seatedTableKeys.some((tk) => {
    const gs = getState(tk)
    if (!gs || gs.players.length === 0) return false
    return isPostBoardWageringStreet(gs) || gs.phase === 'answering'
  })
}

export function venueAllPostBoardWageringComplete(
  seatedTableKeys: string[],
  getState: (sessionKey: string) => GameState | undefined
): boolean {
  const seated = seatedTableKeys.filter((tk) => {
    const gs = getState(tk)
    return gs != null && gs.players.length > 0
  })
  if (seated.length === 0) return false

  const inWave = seated.filter((tk) => {
    const gs = getState(tk)!
    return isPostBoardWageringStreet(gs) || gs.phase === 'answering'
  })
  if (inWave.length === 0) return false

  return inWave.every((tk) => tablePastPostBoardWagering(getState(tk)!))
}

export function openAnsweringPhase(gs: GameState, answerDeadlineMs: number | null): GameState {
  if (!isPostBoardWageringClosed(gs)) return gs
  return {
    ...gs,
    phase: 'answering',
    round: {
      ...gs.round,
      ...(answerDeadlineMs != null ? { answerDeadline: answerDeadlineMs } : { answerDeadline: undefined }),
    },
  }
}

export type VenueWageringOrchestrationPlan = {
  tableUpdates: { sessionKey: string; gameState: GameState; answerDeadlineMs: number | null }[]
  scheduleShowdownAtMs: number | null
  cancelShowdown: boolean
}

export function planVenueWageringOrchestration(args: {
  seatedTableKeys: string[]
  getState: (sessionKey: string) => GameState | undefined
  currentShowdownAtMs: number | undefined
  nowMs?: number
}): VenueWageringOrchestrationPlan {
  const nowMs = args.nowMs ?? Date.now()
  const tableUpdates: VenueWageringOrchestrationPlan['tableUpdates'] = []

  const inWave = venueInPostBoardAnswerWave(args.seatedTableKeys, args.getState)
  const allComplete = venueAllPostBoardWageringComplete(args.seatedTableKeys, args.getState)

  let showdownAt = args.currentShowdownAtMs
  let scheduleShowdownAtMs: number | null = null
  if (allComplete && showdownAt == null) {
    showdownAt = nowMs + VENUE_POST_BOARD_SHOWDOWN_GRACE_MS
    scheduleShowdownAtMs = showdownAt
  }

  for (const tk of args.seatedTableKeys) {
    const gs = args.getState(tk)
    if (!gs || gs.players.length === 0) continue

    if (isPostBoardWageringClosed(gs)) {
      const deadline = showdownAt ?? null
      const next = openAnsweringPhase(gs, deadline)
      if (next.phase !== gs.phase || next.round.answerDeadline !== gs.round.answerDeadline) {
        tableUpdates.push({ sessionKey: tk, gameState: next, answerDeadlineMs: deadline })
      }
      continue
    }

    if (gs.phase === 'answering' && showdownAt != null && gs.round.answerDeadline !== showdownAt) {
      tableUpdates.push({
        sessionKey: tk,
        gameState: { ...gs, round: { ...gs.round, answerDeadline: showdownAt } },
        answerDeadlineMs: showdownAt,
      })
    }
  }

  return {
    tableUpdates,
    scheduleShowdownAtMs,
    cancelShowdown: !inWave,
  }
}
