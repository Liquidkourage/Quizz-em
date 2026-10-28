import { Server, Socket } from 'socket.io'
import {
  canPreloadTriviaAnswer,
  createEmptyGame,
  addPlayer,
  removePlayer,
  isDisplayNameTaken,
  inChipContest,
  startGame,
  setQuestion,
  dealHoleCards,
  openBettingRound1,
  playersHaveHoleCards,
  dealInitialCards,
  dealCommunityCards,
  placeBet,
  foldPlayer,
  submitAnswer,
  answerCompositionForPlayer,
  communityIndicesFromAnswerComposition,
  inferAnswerComposition,
  PLAYER_ANSWER_DIGIT_CARD_COUNT,
  revealAnswer,
  advanceRevealToShowdown,
  endRound,
  formatTriviaNumber,
  isSubmittedAnswerComposableFromDeal,
  adminCloseBetting,
  adminAdvanceTurn,
  computeOptimalTableCount,
  planLobbyTableGroups,
  splitIntoTableSizes,
  shuffle,
  LOBBY_TABLE_ID,
  pickRandomQuestion,
  playerCheck,
  playerCall,
  playerRaise,
  playerAllIn,
  SAMPLE_QUESTIONS,
  STARTER_QUESTION_SET,
  STARTER_SETLIST_ID,
  createStarterSetlist,
  buildDisplayPreviewGameState,
  VENUE_NUMBERED_TABLE_MAX,
  VENUE_WALL_SEAT_SLOTS,
  rehearsalSeatDisplayName,
  rehearsalVenueTableRosterSizes,
  displayActingSeatIndex,
  displayBlindSeatIndices,
  chipsRequiredToCall,
  pctOfStackToCall,
  normalizeBettingTurn,
  previewChipPayoutByPlayerId,
  venueWallDisplayPot,
  venueShuffleDisplayFields,
  VENUE_CONDENSE_MAX_SEATS,
  VENUE_CONDENSE_MIN_SEATS,
} from '@qhe/core'
import type { Question, GameState } from '@qhe/core'
import type { 
  ClientHello,
  DisplayLayoutPayload,
  DisplayVenueTileSnapshot,
  DisplayVenueWallSnapshot,
  HostVenueFeltBeatRow,
  PlayerVenueBrief,
  ServerAck, 
  DealCardsAction,
  BetAction,
  FoldAction,
  SubmitAnswerAction,
  StartAnsweringAction,
  RevealAnswerAction,
  EndRoundAction,
  NewGameAction,
  CheckAction,
  CallAction,
  RaiseAction,
  AllInAction,
  AdminCloseBettingAction,
  AdminAdvanceTurnAction,
  AdminSetBlindsAction,
} from '@qhe/net'
import { normalizeDisplayLayoutPayload } from '@qhe/net'
import {
  addVirtualPlayers as spawnVirtualPlayers,
  removeAllVirtualPlayers,
  advanceVirtualBettingStep,
  runVirtualPlayerSimulation as simulateVirtualPlayers,
  tableIsCpuOnly,
  liveVirtualCount,
} from './virtual-players'
import { planVenueWageringOrchestration } from './venue-wagering-orchestration'
import {
  applyVenueCondenseAfterRound,
  venueCondenseSnapshotFromRooms,
  venueSeatingAnnouncementFromResult,
} from './venue-condense'
import {
  alignVenueShuffleCounterAfterManualShuffle,
  getVenueHandsCompleted,
  getVenueShuffleEvery,
  isVenueShuffleHeld,
  loadVenueShuffleSettingsFromDisk,
  recordVenueShuffleHandCompleted,
  resetVenueShuffleCounter,
  setVenueShuffleEvery,
  setVenueSkipNextShuffle,
} from './venue-shuffle-settings'
import {
  fastForwardTableToShowdown,
  rehearsalFallbackQuestion,
} from './rehearsal-fast-forward'
import {
  buildHostVenueFloorBrief,
  clearVenueHostLog,
  getVenueLastHandDisplay,
  recordVenueHostHandResults,
  recordVenueMovesBetweenStates,
  setVenueLastHandDisplay,
  attachVenueLastHandSeating,
  clearVenueLastHandDisplay,
  shortPlayerName,
} from './venue-host-log'
import {
  coerceImportQuestions,
  pruneSetlistRefs,
  type VenueLibraryData,
} from './venue-library-persist'
import { loadVenueLibraries, persistVenueLibraries } from './venue-library-db'
import {
  loadVenueAnswerWindowSettingsFromDisk,
  initAnswerWindowEnvDefault,
  getVenueAnswerWindowSeconds,
  setVenueAnswerWindowSecondsPersist,
  resolveAnswerWindowSecondsForStart,
  ANSWER_WINDOW_MIN_SEC,
  ANSWER_WINDOW_MAX_SEC,
} from './venue-answer-window-settings'
import {
  applyEffectiveBlindsToGameState,
  clearTableBlindsOverride,
  effectiveBlindsForSessionKey,
  hostLibraryBlindsPayload,
  loadVenueBlindSettingsFromDisk,
  recordVenueHandCompleted,
  setTableBlindsOverride,
  setVenueBlindStructurePersist,
  setVenueBlindsPersist,
} from './venue-blind-settings'
import {
  clearPlayerSocketRegistry,
  getSocketForPlayer,
  initPlayerSocketRegistry,
  registerPlayerSocket,
  unregisterPlayerSocket,
} from './player-socket-registry'

export {
  clearPlayerSocketRegistry,
  getSocketForPlayer,
  registerPlayerSocket,
  unregisterPlayerSocket,
}

export type { SubmitAnswerAction }

export {
  addPlayer,
  adminAdvanceTurn,
  adminCloseBetting,
  canPreloadTriviaAnswer,
  ANSWER_WINDOW_MAX_SEC,
  ANSWER_WINDOW_MIN_SEC,
  applyEffectiveBlindsToGameState,
  attachVenueLastHandSeating,
  clearTableBlindsOverride,
  clearVenueHostLog,
  clearVenueLastHandDisplay,
  coerceImportQuestions,
  computeOptimalTableCount,
  createEmptyGame,
  planLobbyTableGroups,
  createStarterSetlist,
  endRound,
  foldPlayer,
  formatTriviaNumber,
  hostLibraryBlindsPayload,
  isDisplayNameTaken,
  isSubmittedAnswerComposableFromDeal,
  liveVirtualCount,
  LOBBY_TABLE_ID,
  pickRandomQuestion,
  placeBet,
  playerAllIn,
  playerCall,
  playerCheck,
  playerRaise,
  playersHaveHoleCards,
  pruneSetlistRefs,
  recordVenueHandCompleted,
  recordVenueHostHandResults,
  recordVenueShuffleHandCompleted,
  removeAllVirtualPlayers,
  resetVenueShuffleCounter,
  resolveAnswerWindowSecondsForStart,
  revealAnswer,
  setTableBlindsOverride,
  setVenueAnswerWindowSecondsPersist,
  setVenueBlindStructurePersist,
  setVenueBlindsPersist,
  setVenueLastHandDisplay,
  shuffle,
  spawnVirtualPlayers,
  splitIntoTableSizes,
  STARTER_QUESTION_SET,
  STARTER_SETLIST_ID,
  startGame,
  submitAnswer,
  tableIsCpuOnly,
  VENUE_CONDENSE_MAX_SEATS,
  VENUE_CONDENSE_MIN_SEATS,
  VENUE_NUMBERED_TABLE_MAX,
  venueSeatingAnnouncementFromResult,
}

export let io!: Server

export function bindGameIo(server: Server) {
  io = server
}

/** Last displayHeartbeat epoch ms per venue → socketId (presence / health). */
export const displayHeartbeatByVenue = new Map<string, Map<string, number>>()

export function normalizeVenueCode(roomCode: string): string {
  return roomCode.trim().toUpperCase()
}

export function normalizeTableId(tableId: string | undefined): string {
  const t = (tableId ?? '1').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || '1'
  return t
}

/** One isolated table roster + deck + phase inside a venue (maps to sockets + persisted state key). */
export function tableSessionKey(venueCode: string, tableId?: string): string {
  return `${normalizeVenueCode(venueCode)}:${normalizeTableId(tableId)}`
}

export const rooms = new Map<string, GameState>()
/** Soft guide deadline (epoch ms) for the venue answer countdown UI — host must reveal. */
export const venueShowdownAtMs = new Map<string, number>()
export const venueOrchestrationGuard = new Set<string>()
/** Produced TV beat: reveal → showdown after this many ms. */
export const REVEAL_BEAT_MS = 8_000
export const venueRevealToShowdownTimers = new Map<string, ReturnType<typeof setTimeout>>()
/** Epoch ms when End Round finished — drives display payout/intermission beats. */
export const venuePostHandBeatStartedAtMs = new Map<string, number>()
export let venueLibraries!: Map<string, VenueLibraryData>
export const venuePlayhead = new Map<string, { setlistId: string | null; nextIndex: number }>()

export function clearVenueWageringOrchestrationState(venueCode: string) {
  venueShowdownAtMs.delete(normalizeVenueCode(venueCode))
}

export function clearVenueRevealBeatTimer(venueCode: string) {
  const vn = normalizeVenueCode(venueCode)
  const t = venueRevealToShowdownTimers.get(vn)
  if (t != null) clearTimeout(t)
  venueRevealToShowdownTimers.delete(vn)
}

/** After host reveal: short reveal phase on every felt, then auto-advance to showdown. */
export function scheduleVenueRevealToShowdown(venueCode: string) {
  const vn = normalizeVenueCode(venueCode)
  clearVenueRevealBeatTimer(vn)
  venueRevealToShowdownTimers.set(
    vn,
    setTimeout(() => {
      venueRevealToShowdownTimers.delete(vn)
      const rows = venuePlayableSnapshots(vn)
      let advanced = 0
      for (const { tk } of rows) {
        let gs = rooms.get(tk)
        if (!gs || gs.phase !== 'reveal') continue
        gs = advanceRevealToShowdown(gs)
        rooms.set(tk, gs)
        emitVenueTableState(tk, gs)
        advanced++
      }
      if (advanced > 0) emitDisplayVenueSnapshotNow(vn)
    }, REVEAL_BEAT_MS),
  )
}

/** Remember the soft answer-guide deadline for lockstep UI; do not auto-close answers. */
export function armVenueAnswerGuideDeadline(venueCode: string, fireAtMs: number) {
  venueShowdownAtMs.set(normalizeVenueCode(venueCode), fireAtMs)
}

/** Deal five community cards on every seated pre-board felt (round 2 opens). */
export function dealCommunityBoardForVenue(
  vnRaw: string,
  opts?: { auto?: boolean },
): boolean {
  const vn = normalizeVenueCode(vnRaw)
  const rows = venuePlayableSnapshots(vn)
  if (rows.length === 0) return false

  const ready = rows.every(
    (r) =>
      r.gs.phase === 'betting' &&
      r.gs.round.bettingRound === 1 &&
      (r.gs.round.communityCards?.length ?? 0) < 5 &&
      (opts?.auto ? r.gs.round.isBettingOpen !== true : true),
  )
  if (!ready) return false

  clearVenueWageringOrchestrationState(vn)
  let anyDealt = false
  let anyAutoClosed = false
  for (const { tk } of rows) {
    let gs = rooms.get(tk)
    if (!gs) continue
    if (gs.round.isBettingOpen) {
      gs = adminCloseBetting(gs)
      anyAutoClosed = true
    }
    const communityBefore = gs.round.communityCards.length
    gs = dealCommunityCards(gs)
    const dealt = gs.round.communityCards.length > communityBefore
    if (dealt) anyDealt = true
    rooms.set(tk, gs)
    if (dealt) {
      emitVenueTableState(tk, gs, { skipOrchestration: true })
      if (tableIsCpuOnly(gs)) {
        enqueueCpuOnlyVpDrain(tk)
      } else {
        gs = runVirtualPlayerSimulation(gs)
        rooms.set(tk, gs)
        emitVenueTableState(tk, gs, { skipOrchestration: true })
      }
      io.to(tk).emit('dealingCommunityCards')
      const boardTableNum = tableNumFromSessionKey(gs.code, tk)
      if (boardTableNum != null) {
        io.to(displayVenueRoom(vn)).emit('dealingCommunityCards', {
          tableNum: boardTableNum,
        })
      }
    } else {
      emitVenueTableState(tk, gs, { skipOrchestration: true })
    }
  }
  if (anyDealt) {
    const msg = opts?.auto
      ? 'Round 1 complete — board dealt on every table.'
      : anyAutoClosed
        ? 'Closed round 1 + dealt board — wagering round 2 (every table at this venue).'
        : 'Board complete — wagering round 2 (every table at this venue).'
    io.to(hostVenueRoom(vn)).emit('toast', msg)
  }
  return anyDealt
}

export function applyVenueWageringOrchestration(venueCode: string) {
  const vn = normalizeVenueCode(venueCode)
  if (venueOrchestrationGuard.has(vn)) return
  venueOrchestrationGuard.add(vn)
  try {
    const seated = allSeatedTableSessionsInVenue(vn)
    const plan = planVenueWageringOrchestration({
      seatedTableKeys: seated,
      getState: (tk) => rooms.get(tk),
      currentShowdownAtMs: venueShowdownAtMs.get(vn),
    })

    if (plan.dealCommunityBoard) {
      if (dealCommunityBoardForVenue(vn, { auto: true })) {
        emitDisplayVenueSnapshotNow(vn)
        return
      }
    }

    if (plan.cancelShowdown) {
      clearVenueWageringOrchestrationState(vn)
    } else if (plan.scheduleShowdownAtMs != null) {
      armVenueAnswerGuideDeadline(vn, plan.scheduleShowdownAtMs)
      io.to(hostVenueRoom(vn)).emit(
        'toast',
        'Last table finished wagering — 45s guide countdown (reveal when ready).',
      )
    }

    if (plan.tableUpdates.length === 0) return

    let openedAnsweringWithTimer = false
    for (const update of plan.tableUpdates) {
      const prev = rooms.get(update.sessionKey)
      let gs = runVirtualPlayerSimulation(update.gameState)
      rooms.set(update.sessionKey, gs)
      io.to(update.sessionKey).emit('state', gs)
      if (
        prev?.phase !== 'answering' &&
        gs.phase === 'answering' &&
        update.answerDeadlineMs != null
      ) {
        openedAnsweringWithTimer = true
      }
    }
    if (openedAnsweringWithTimer && plan.scheduleShowdownAtMs != null) {
      const sec = Math.max(1, Math.round((plan.scheduleShowdownAtMs - Date.now()) / 1000))
      io.to(hostVenueRoom(vn)).emit(
        'toast',
        `Answer window open — ${sec}s guide on all tables; reveal when you are ready.`,
      )
    }
    emitDisplayVenueSnapshotNow(vn)
  } finally {
    venueOrchestrationGuard.delete(vn)
  }
}

export async function persistVenues() {
  await persistVenueLibraries(venueLibraries)
}

export function hostVenueRoom(venueCode: string): string {
  return `HOST:${normalizeVenueCode(venueCode)}`
}

export function displayVenueRoom(venueCode: string): string {
  return `DISPLAY:${normalizeVenueCode(venueCode)}`
}

export function playerVenueRoom(venueCode: string): string {
  return `PLAYER:${normalizeVenueCode(venueCode)}`
}

export function buildPlayerVenueBrief(vnRaw: string): PlayerVenueBrief {
  const vn = normalizeVenueCode(vnRaw)
  const blindsSnap = hostLibraryBlindsPayload(vn)
  const ph = getPlayhead(vn)
  const lib = venueLibraries.get(vn)
  let setlistCueNumber: number | null = null
  let setlistCueTotal: number | null = null
  if (ph.setlistId && lib) {
    const sl = lib.setlists.find((s) => s.id === ph.setlistId)
    if (sl && sl.questionIds.length > 0) {
      setlistCueTotal = sl.questionIds.length
      if (ph.nextIndex > 0 && ph.nextIndex <= sl.questionIds.length) {
        setlistCueNumber = ph.nextIndex
      }
    }
  }
  const condenseCounts = venueCondenseSnapshotFromRooms({
    venueCode: vn,
    getState: (tk) => rooms.get(tk),
    tableNumFromSessionKey,
    allTableSessionKeys: allTableSessionsInVenue,
  })
  const shuffleDisplay = venueShuffleDisplayFields({
    handsCompletedAtVenue: getVenueHandsCompleted(vn),
    liveTableCount: condenseCounts.liveTableCount,
    every: getVenueShuffleEvery(vn),
    skipNext: isVenueShuffleHeld(vn),
  })
  return {
    setlistCueNumber,
    setlistCueTotal,
    venueChipSurvivorCount: condenseCounts.chipSurvivorCount,
    venueLiveTableCount: condenseCounts.liveTableCount,
    venueSmallBlind: blindsSnap.smallBlind,
    venueBigBlind: blindsSnap.bigBlind,
    blindLevelNumber: blindsSnap.blindLevelIndex + 1,
    blindLevelCount: blindsSnap.blindLevelCount,
    handsUntilNextBlindLevel: blindsSnap.handsUntilNextLevel,
    venueHandsUntilShuffle: shuffleDisplay.handsUntilShuffle,
    venueShuffleEveryHands: shuffleDisplay.shuffleEveryHands,
    venueHeld: isVenueHeld(vn),
    venueShuffleHeld: isVenueShuffleHeld(vn),
  }
}

export function emitPlayerVenueBriefNow(vnRaw: string) {
  io.to(playerVenueRoom(vnRaw)).emit('playerVenueBrief', buildPlayerVenueBrief(vnRaw))
}

export const venueDisplayLayouts = new Map<string, DisplayLayoutPayload>()

export function normalizeDisplayFocusTable(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    if (raw >= 1 && raw <= VENUE_NUMBERED_TABLE_MAX) return raw
    return null
  }
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw.trim(), 10)
    if (Number.isInteger(n) && n >= 1 && n <= VENUE_NUMBERED_TABLE_MAX) return n
    return null
  }
  return null
}

export function parseDisplaySetLayoutPayload(payload: unknown): DisplayLayoutPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.layout !== 'venueWall') return null
  return normalizeDisplayLayoutPayload(p)
}

/** Normalize persisted or legacy payloads (older builds stored `singleTable`). */
export function coerceDisplayLayoutPayload(raw: unknown): DisplayLayoutPayload {
  if (!raw || typeof raw !== 'object') return normalizeDisplayLayoutPayload(null)
  const o = raw as Record<string, unknown>
  if (o.layout === 'singleTable' && typeof o.tableId === 'string') {
    const tid = normalizeTableId(o.tableId.trim())
    const n = Number.parseInt(String(tid), 10)
    return normalizeDisplayLayoutPayload({
      layout: 'venueWall',
      focusTable: Number.isInteger(n) && n >= 1 && n <= VENUE_NUMBERED_TABLE_MAX ? n : null,
    })
  }
  if (o.layout === 'venueWall') {
    return normalizeDisplayLayoutPayload(o)
  }
  return normalizeDisplayLayoutPayload(null)
}

export function resolveDisplayLayoutForHello(venueCode: string, data: ClientHello): DisplayLayoutPayload {
  const k = normalizeVenueCode(venueCode)
  const stored = venueDisplayLayouts.get(k)
  if (stored != null) return coerceDisplayLayoutPayload(stored)
  if (data.displayVenueWall) {
    return normalizeDisplayLayoutPayload({
      layout: 'venueWall',
      focusTable: normalizeDisplayFocusTable(data.displayFocusTable),
    })
  }
  const tid = normalizeTableId(data.tableId ?? '1')
  const n = Number.parseInt(String(tid), 10)
  const focus = Number.isInteger(n) && n >= 1 && n <= VENUE_NUMBERED_TABLE_MAX ? n : null
  return normalizeDisplayLayoutPayload({ layout: 'venueWall', focusTable: focus })
}

export const DISPLAY_PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short code ↔ waiting display socket until host claims pairing */
export type DisplayPairingPending = { socketId: string; created: number }
export const displayPairByCode = new Map<string, DisplayPairingPending>()
export const displayPairCodeBySocketId = new Map<string, string>()

export type DisplaySockData = {
  sessionKey?: string
  role?: string
  hostAuthed?: boolean
  displayAwaitPairing?: boolean
  displayClientName?: string
  /** Normalized venue code for syncState / heartbeat without parsing session keys. */
  venueCode?: string
}

export function resolveVenueCodeForSocket(socket: Socket): string | null {
  const sockData = socket.data as DisplaySockData
  if (typeof sockData.venueCode === 'string' && sockData.venueCode.trim()) {
    return normalizeVenueCode(sockData.venueCode)
  }
  const sessionKey = getActiveSessionKey(socket)
  if (!sessionKey) return null
  const gs = rooms.get(sessionKey) as { code?: string } | undefined
  if (typeof gs?.code === 'string' && gs.code.trim()) {
    return normalizeVenueCode(gs.code)
  }
  const colon = sessionKey.indexOf(':')
  if (colon > 0) return normalizeVenueCode(sessionKey.slice(0, colon))
  return null
}

export function clearDisplayPairingForSocket(socketId: string) {
  const code = displayPairCodeBySocketId.get(socketId)
  if (!code) return
  displayPairCodeBySocketId.delete(socketId)
  displayPairByCode.delete(code)
}

export function mintDisplayPairingCode(): string {
  for (let attempts = 0; attempts < 120; attempts++) {
    let s = ''
    for (let i = 0; i < 4; i++) {
      s += DISPLAY_PAIRING_ALPHABET[Math.floor(Math.random() * DISPLAY_PAIRING_ALPHABET.length)]!
    }
    if (!displayPairByCode.has(s)) return s
  }
  return `Z${(100 + Math.floor(Math.random() * 900)).toString()}`
}

export function assignDisplayPairing(socket: Socket): string {
  clearDisplayPairingForSocket(socket.id)
  const code = mintDisplayPairingCode()
  displayPairByCode.set(code, { socketId: socket.id, created: Date.now() })
  displayPairCodeBySocketId.set(socket.id, code)
  return code
}

/** Join DISPLAY:{venue}, route layouts & felt session — shared by hello + pairing attach */
export function wireDisplaySocketToVenue(socket: Socket, venueCodeRaw: string, data: ClientHello) {
  const vn = normalizeVenueCode(venueCodeRaw)
  const sockData = socket.data as DisplaySockData
  sockData.displayAwaitPairing = false
  sockData.venueCode = vn
  sockData.role = 'display'

  socket.join(displayVenueRoom(vn))
  const layout = resolveDisplayLayoutForHello(vn, data)
  socket.emit('displayLayout', layout)

  const spotlightWatchTableId =
    layout.focusTable != null &&
    Number.isInteger(layout.focusTable) &&
    layout.focusTable >= 1 &&
    layout.focusTable <= VENUE_NUMBERED_TABLE_MAX
      ? String(layout.focusTable)
      : null

  let sessionTableIdRaw = spotlightWatchTableId

  if (
    !sessionTableIdRaw &&
    layout.focusTable == null &&
    typeof data.displayFocusTable === 'number'
  ) {
    const ftJoin = normalizeDisplayFocusTable(data.displayFocusTable)
    if (ftJoin != null) sessionTableIdRaw = String(ftJoin)
  }

  if (!sessionTableIdRaw) {
    sockData.sessionKey = undefined
    const ackWall: ServerAck = { ok: true, message: 'Connected successfully' }
    socket.emit('ack', ackWall)
    emitDisplayVenueSnapshotNow(vn)
    return
  }

  const watchKey = tableSessionKey(vn, normalizeTableId(sessionTableIdRaw))
  socket.join(watchKey)
  sockData.sessionKey = watchKey
  const gs = rooms.get(watchKey)
  if (!gs) {
    /** Spotlight / felt preview only — numbered sessions are created when the host seats the lobby */
    const tid = normalizeTableId(sessionTableIdRaw)
    const tidN = Number.parseInt(String(tid), 10)
    const synthetic =
      Number.isInteger(tidN) && tidN >= 1 && tidN <= VENUE_NUMBERED_TABLE_MAX
        ? buildDisplayPreviewGameState(normalizeVenueCode(vn), tid)
        : createEmptyGame(vn, '', tid)
    socket.emit('ack', { ok: true, message: 'Connected successfully' } satisfies ServerAck)
    socket.emit('state', runVirtualPlayerSimulation(synthetic))
    emitDisplayVenueSnapshotNow(vn)
    return
  }

  let gsLive = gs
  gsLive = runVirtualPlayerSimulation(gsLive)
  rooms.set(watchKey, gsLive)
  const ackDs: ServerAck = { ok: true, message: 'Connected successfully' }
  socket.emit('ack', ackDs)
  emitVenueTableState(watchKey, gsLive)
}

export async function ensureVenueLibrary(venueCode: string): Promise<VenueLibraryData> {
  const k = normalizeVenueCode(venueCode)
  if (!venueLibraries.has(k)) {
    venueLibraries.set(k, {
      questions: STARTER_QUESTION_SET.map((q) => ({ ...q })),
      setlists: [createStarterSetlist(STARTER_QUESTION_SET)],
    })
    await persistVenues()
  }
  return venueLibraries.get(k)!
}

export function getPlayhead(venueCode: string) {
  return (
    venuePlayhead.get(normalizeVenueCode(venueCode)) ?? {
      setlistId: null,
      nextIndex: 0,
    }
  )
}

export async function buildHostLibraryPayload(venueCode: string) {
  const k = normalizeVenueCode(venueCode)
  const lib = await ensureVenueLibrary(k)
  const ph = getPlayhead(k)
  return {
    questions: lib.questions.map((q) => ({ ...q })),
    setlists: lib.setlists.map((s) => ({
      ...s,
      questionIds: [...s.questionIds],
    })),
    activeSetlistId: ph.setlistId,
    activeSetlistNextIndex: ph.nextIndex,
    answerWindowSeconds: getVenueAnswerWindowSeconds(k),
    venueBlinds: hostLibraryBlindsPayload(k),
  }
}

/** Push persisted venue blinds onto every session (respects per-table overrides). */
export function syncVenueBlindsToAllSessions(vn: string) {
  for (const tk of allVenueSessionKeys(vn)) {
    const gs = rooms.get(tk)
    if (!gs) continue
    const next = applyEffectiveBlindsToGameState(gs, vn, tk)
    if (next.smallBlind !== gs.smallBlind || next.bigBlind !== gs.bigBlind) {
      rooms.set(tk, next)
      io.to(tk).emit('state', next)
    }
  }
}

export async function emitHostLibrary(venueCode: string) {
  io.to(hostVenueRoom(venueCode)).emit('hostLibrary', await buildHostLibraryPayload(venueCode))
}

export function pruneIdFromAllSetlists(lib: VenueLibraryData, questionId: string) {
  for (const sl of lib.setlists) {
    sl.questionIds = sl.questionIds.filter((id) => id !== questionId)
  }
}

export function sanitizeSetlistQuestionIds(lib: VenueLibraryData, ids: string[]): string[] {
  const known = new Set(lib.questions.map((q) => q.id))
  return ids.filter((id) => known.has(id))
}

/** Authenticated host desk (role + optional HOST_SECRET) — enough for venue library edits. */
export function assertHostRole(socket: Socket): boolean {
  const sd = socket.data as { role?: string; hostAuthed?: boolean }
  if (sd.role !== 'host') {
    socket.emit('toast', 'Only the host can perform this action.')
    return false
  }
  const required = process.env.HOST_SECRET?.trim()
  if (required && !sd.hostAuthed) {
    socket.emit('toast', 'Host session is not authenticated (check HOST_SECRET).')
    return false
  }
  return true
}

/** Point every felt in the venue at this host socket (hello / reclaim). */
export function bindSocketAsVenueHost(socket: Socket, venueCode: string): void {
  const vn = normalizeVenueCode(venueCode)
  for (const tk of allVenueSessionKeys(vn)) {
    const gs = rooms.get(tk)
    if (gs) rooms.set(tk, { ...gs, hostId: socket.id })
  }
}

/**
 * Live table control. Authenticated host desks reclaim a stale `hostId` binding
 * (reconnect, Assign moving the socket, second tab closed, table switch) instead
 * of toast-blocking Run show. Library edits use {@link assertHostRole} only.
 */
export function assertVenueHost(socket: Socket, gs: { hostId: string; code: string }): boolean {
  if (!assertHostRole(socket)) return false
  if (socket.id !== gs.hostId) {
    bindSocketAsVenueHost(socket, gs.code)
    // Keep the caller's local snapshot aligned so the end-of-handler rooms.set
    // does not write the old hostId back over the rebind.
    gs.hostId = socket.id
  }
  return true
}

export function getActiveSessionKey(socket: Socket): string | undefined {
  const fromData = (socket.data as { sessionKey?: string }).sessionKey
  if (typeof fromData === 'string' && fromData.length > 0) return fromData
  const ids = Array.from(socket.rooms)
  return ids.length > 1 ? ids[1] : undefined
}

/** Socket map keys belonging to every table in one venue (`VENUE:tableId`). */
export function venueSessionKeyPrefix(venueCode: string): string {
  return `${normalizeVenueCode(venueCode)}:`
}

export function isLobbySessionKey(sessionKey: string): boolean {
  return sessionKey.endsWith(`:${LOBBY_TABLE_ID}`)
}

export function allVenueSessionKeys(venueCode: string): string[] {
  const pref = venueSessionKeyPrefix(venueCode)
  return [...rooms.keys()].filter(k => k.startsWith(pref)).sort()
}

/** True once a host has opened this venue (rejects typo codes that would spawn empty rooms). */
export function venueHasHost(venueCode: string): boolean {
  for (const tk of allVenueSessionKeys(venueCode)) {
    const gs = rooms.get(tk)
    if (gs != null && typeof gs.hostId === 'string' && gs.hostId.trim().length > 0) {
      return true
    }
  }
  return false
}

/** Playable tables only (excludes lobby pool). */
export function allTableSessionsInVenue(venueCode: string): string[] {
  return allVenueSessionKeys(venueCode).filter(k => !isLobbySessionKey(k))
}

/** Numbered felts with at least one seated player — lockstep host cues ignore empty sessions. */
export function allSeatedTableSessionsInVenue(venueCode: string): string[] {
  return allTableSessionsInVenue(venueCode).filter((tk) => {
    const gs = rooms.get(tk)
    return gs != null && gs.players.length > 0
  })
}

/** Lowest numbered felt that already has players, for a host refresh that landed in the empty lobby. */
export function lowestSeatedTableInVenue(venueCode: string): { sessionKey: string; tableId: string } | null {
  const vn = normalizeVenueCode(venueCode)
  let best: { sessionKey: string; n: number } | null = null
  for (const tk of allSeatedTableSessionsInVenue(vn)) {
    const n = tableNumFromSessionKey(vn, tk)
    if (n == null) continue
    if (!best || n < best.n) best = { sessionKey: tk, n }
  }
  return best ? { sessionKey: best.sessionKey, tableId: String(best.n) } : null
}

/** Seats labeled on the public venue-wall mosaic (matches felt chair count in UI). */
export const VENUE_WALL_SEAT_COUNT = VENUE_WALL_SEAT_SLOTS

/** Seats wired into the venue wall / welcome mosaic (human + rehearsal CPU vp:*). */
export function welcomeWallSeatCount(gs: GameState): number {
  return gs.players.length
}

/** Hidden on displays after venue-wide Start Game until New Game resets the venue. */
export const venueAudienceWelcomeExpired = new Set<string>()

/** Keep seating chart on TVs for at least this long after assign (ms). */
export const SEATING_CHART_MIN_VISIBLE_MS = 60_000
export const venueSeatingChartPinnedUntilMs = new Map<string, number>()

/** Host nudge → auto check/fold if the acting human still hasn't acted. */
export const HUMAN_NUDGE_TIMEOUT_MS = 30_000
export const humanTurnTimers = new Map<string, ReturnType<typeof setTimeout>>()
/** sessionKey → epoch ms when a host-nudged shot clock expires (unset until nudged). */
export const humanTurnDeadlineMs = new Map<string, number>()
/** sessionKey → `${playerId}:${seatIndex}` the deadline applies to (cleared when the actor changes). */
export const humanTurnActorKey = new Map<string, string>()

/** Venue codes whose phones, TVs, and cue bar are frozen until the host resumes. */
const venueHeld = new Set<string>()
const venueHoldStartedAtMs = new Map<string, number>()

export function isVenueHeld(venueCode: string): boolean {
  return venueHeld.has(normalizeVenueCode(venueCode))
}

export function markVenueShowStarted(code: string): void {
  const vn = normalizeVenueCode(code)
  if (!venueAudienceWelcomeExpired.has(vn)) {
    venueAudienceWelcomeExpired.add(vn)
    emitDisplayVenueSnapshotNow(vn)
  }
}

/** Drop the join hero once any seated felt leaves lobby (covers setlist/bank paths that skip Start Game). */
export function syncVenueAudienceWelcomeFromTiles(vnRaw: string, tiles: DisplayVenueTileSnapshot[]): void {
  const vn = normalizeVenueCode(vnRaw)
  if (venueAudienceWelcomeExpired.has(vn)) return
  if (tiles.some((t) => t.seated > 0 && t.phase !== 'lobby')) {
    venueAudienceWelcomeExpired.add(vn)
  }
}

export function tableNumFromSessionKey(venueCode: string, sessionKey: string): number | null {
  const vn = normalizeVenueCode(venueCode)
  const pref = `${vn}:`
  if (!sessionKey.startsWith(pref)) return null
  const rest = sessionKey.slice(pref.length)
  if (rest === LOBBY_TABLE_ID) return null
  const n = Number.parseInt(rest, 10)
  if (!Number.isInteger(n) || n < 1 || n > VENUE_NUMBERED_TABLE_MAX || String(n) !== rest) return null
  return n
}

export function moveHumanToTableSession(playerId: string, toSessionKey: string, tableId: string): void {
  const sock = getSocketForPlayer(playerId)
  if (!sock) return
  for (const r of [...sock.rooms]) {
    if (r === sock.id) continue
    if (typeof r === 'string' && r.includes(':') && !isLobbySessionKey(r)) {
      sock.leave(r)
    }
  }
  sock.join(toSessionKey)
  ;(sock.data as { sessionKey?: string }).sessionKey = toSessionKey
  sock.emit('seated', { tableId })
}

export function runVirtualPlayerSimulation(state: GameState): GameState {
  if (isVenueHeld(state.code)) return state
  return simulateVirtualPlayers(state)
}

/** Drop a hold without shifting clocks. Used when the venue is wiped. */
export function clearVenueHold(venueCode: string): void {
  const vn = normalizeVenueCode(venueCode)
  venueHeld.delete(vn)
  venueHoldStartedAtMs.delete(vn)
  for (const { tk } of venuePlayableSnapshots(vn)) {
    clearHumanTurnTimerHandle(tk)
  }
}

/**
 * Freeze or resume the room.
 * Nudge clocks and answer guides keep the time that was left when the hold started.
 */
export function setVenueRoomHold(venueCode: string, held: boolean): boolean {
  const vn = normalizeVenueCode(venueCode)
  if (held) {
    if (venueHeld.has(vn)) return true
    venueHeld.add(vn)
    venueHoldStartedAtMs.set(vn, Date.now())
    for (const { tk } of venuePlayableSnapshots(vn)) {
      clearHumanTurnTimerHandle(tk)
    }
    emitDisplayVenueSnapshotNow(vn)
    return true
  }
  if (!venueHeld.has(vn)) return false
  const started = venueHoldStartedAtMs.get(vn) ?? Date.now()
  const elapsed = Math.max(0, Date.now() - started)
  venueHeld.delete(vn)
  venueHoldStartedAtMs.delete(vn)
  for (const { tk, gs } of venuePlayableSnapshots(vn)) {
    const deadline = humanTurnDeadlineMs.get(tk)
    if (deadline != null) humanTurnDeadlineMs.set(tk, deadline + elapsed)
    const answerDeadline = gs.round.answerDeadline
    let next = gs
    if (typeof answerDeadline === 'number' && Number.isFinite(answerDeadline)) {
      next = { ...gs, round: { ...gs.round, answerDeadline: answerDeadline + elapsed } }
      rooms.set(tk, next)
    }
    if (humanTurnDeadlineMs.has(tk)) scheduleHumanTurnTimeout(tk, next)
    emitVenueTableState(tk, next)
  }
  emitDisplayVenueSnapshotNow(vn)
  return false
}

function withDealerInRange(gs: GameState): GameState {
  const n = gs.players.length
  if (n <= 0) return gs
  const dealer = gs.round.dealerIndex
  if (Number.isInteger(dealer) && dealer >= 0 && dealer < n) return gs
  return { ...gs, round: { ...gs.round, dealerIndex: 0 } }
}

/** Host: move any seated player to another table. Only while every felt is between hands. */
export function moveSeatedPlayer(
  venueCode: string,
  playerId: string,
  toTableNum: number,
): { ok: true; message: string } | { ok: false; message: string } {
  const vn = normalizeVenueCode(venueCode)
  const toNum = Math.floor(Number(toTableNum))
  if (!Number.isInteger(toNum) || toNum < 1 || toNum > VENUE_NUMBERED_TABLE_MAX) {
    return { ok: false, message: `Pick a table from 1 to ${VENUE_NUMBERED_TABLE_MAX}.` }
  }
  const found = findPlayerSessionInVenue(vn, playerId)
  if (!found || isLobbySessionKey(found.sessionKey)) {
    return { ok: false, message: 'That player is not seated at a table.' }
  }
  const fromNum = tableNumFromSessionKey(vn, found.sessionKey)
  if (fromNum == null) return { ok: false, message: 'That player is not seated at a table.' }
  const player = found.gameState.players.find((p) => p.id === playerId)
  if (!player) return { ok: false, message: 'That player is not seated at a table.' }
  const name = shortPlayerName(player.name)
  if (fromNum === toNum) return { ok: false, message: `${name} is already at table ${toNum}.` }

  const busy = venuePlayableSnapshots(vn).find((row) => row.gs.phase !== 'lobby')
  if (busy) {
    return { ok: false, message: 'Move players between hands, when every table is waiting.' }
  }

  const toKey = tableSessionKey(vn, String(toNum))
  const existingDest = rooms.get(toKey)
  if ((existingDest?.players.length ?? 0) >= VENUE_CONDENSE_MAX_SEATS) {
    return { ok: false, message: `Table ${toNum} is full (${VENUE_CONDENSE_MAX_SEATS} seats).` }
  }

  const fromGs = found.gameState
  const nextFrom = withDealerInRange({
    ...fromGs,
    players: fromGs.players.filter((p) => p.id !== playerId),
  })
  rooms.set(found.sessionKey, nextFrom)

  const destBase =
    existingDest ??
    ({
      ...createEmptyGame(vn, fromGs.hostId, String(toNum)),
      smallBlind: fromGs.smallBlind,
      bigBlind: fromGs.bigBlind,
    } satisfies GameState)
  const nextTo = applyEffectiveBlindsToGameState(
    withDealerInRange({ ...destBase, players: destBase.players.concat(player) }),
    vn,
    toKey,
  )
  rooms.set(toKey, nextTo)
  if (!player.id.startsWith('vp:')) moveHumanToTableSession(player.id, toKey, String(toNum))
  emitVenueTableState(found.sessionKey, nextFrom)
  emitVenueTableState(toKey, nextTo)
  emitDisplayVenueSnapshotNow(vn)
  return { ok: true, message: `Moved ${name} from table ${fromNum} to table ${toNum}.` }
}

export function setVenueShuffleEveryAndBroadcast(venueCode: string, every: unknown): number {
  const next = setVenueShuffleEvery(venueCode, every)
  emitDisplayVenueSnapshotNow(venueCode)
  return next
}

export function setVenueSkipNextShuffleAndBroadcast(venueCode: string, skip: boolean): boolean {
  const next = setVenueSkipNextShuffle(venueCode, skip)
  emitDisplayVenueSnapshotNow(venueCode)
  return next
}

export function shuffleVenueTablesNow(
  venueCode: string,
  hostId: string,
): { ok: boolean; message: string } {
  const vn = normalizeVenueCode(venueCode)
  const tables = venuePlayableSnapshots(vn)
  if (tables.length < 2) return { ok: false, message: 'Need at least two tables to shuffle.' }
  if (tables.some((row) => row.gs.phase !== 'lobby')) {
    return { ok: false, message: 'Shuffle tables between hands, when every table is waiting.' }
  }
  const result = runVenueCondenseAfterRound(vn, hostId, true)
  alignVenueShuffleCounterAfterManualShuffle(vn)
  emitDisplayVenueSnapshotNow(vn)
  const message = result.shuffled
    ? `Tables shuffled — ${result.tablesBefore} → ${result.tablesAfter}.`
    : 'Tables stayed as they are.'
  return { ok: result.shuffled, message }
}

export function venueRosterSeats(
  venueCode: string,
): { playerId: string; name: string; tableNum: number }[] {
  const out: { playerId: string; name: string; tableNum: number }[] = []
  for (const row of venuePlayableSnapshots(venueCode)) {
    if (!Number.isFinite(row.n)) continue
    for (const player of row.gs.players) {
      out.push({ playerId: player.id, name: player.name, tableNum: row.n })
    }
  }
  return out
}

export function findPlayerSessionInVenue(
  venueCode: string,
  playerId: string,
): { sessionKey: string; tableId: string; gameState: GameState } | null {
  const vn = normalizeVenueCode(venueCode)
  for (const tk of allVenueSessionKeys(vn)) {
    const gs = rooms.get(tk) as GameState | undefined
    if (!gs) continue
    if (gs.players.some((p) => p.id === playerId)) {
      return { sessionKey: tk, tableId: gs.tableId ?? LOBBY_TABLE_ID, gameState: gs }
    }
  }
  return null
}

export function clearHumanTurnTimerHandle(sessionKey: string): void {
  const timer = humanTurnTimers.get(sessionKey)
  if (timer) {
    clearTimeout(timer)
    humanTurnTimers.delete(sessionKey)
  }
}

export function clearHumanTurnClock(sessionKey: string): void {
  clearHumanTurnTimerHandle(sessionKey)
  humanTurnDeadlineMs.delete(sessionKey)
  humanTurnActorKey.delete(sessionKey)
}

export function buildPlayerOnlineMap(gs: GameState): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const p of gs.players) {
    if (p.id.startsWith('vp:')) {
      out[p.id] = true
      continue
    }
    const sock = getSocketForPlayer(p.id)
    out[p.id] = Boolean(sock?.connected)
  }
  return out
}

export function resolveHumanTurnActor(
  gs: GameState,
): { seatIndex: number; playerId: string; playerName: string } | null {
  if (gs.phase !== 'betting' || !gs.round.isBettingOpen) return null
  const idx = gs.round.currentPlayerIndex
  if (typeof idx !== 'number' || idx < 0) return null
  const player = gs.players[idx]
  if (!player || player.id.startsWith('vp:') || player.hasFolded || !inChipContest(player)) return null
  return { seatIndex: idx, playerId: player.id, playerName: player.name }
}

/** Toast-facing seat label: First L. — never raw `human:…` ids. */
export function toastPlayerLabel(gs: GameState, playerId: string): string {
  const p = gs.players.find((x) => x.id === playerId)
  return shortPlayerName(p?.name ?? '')
}

/** Record host move-log deltas, persist room state, then broadcast. */
export function commitTableAdvance(
  sessionKey: string,
  before: GameState,
  after: GameState,
  opts?: { skipOrchestration?: boolean },
): void {
  const vn = normalizeVenueCode(after.code)
  const tn = tableNumFromSessionKey(vn, sessionKey)
  if (tn != null) {
    recordVenueMovesBetweenStates(vn, tn, before, after)
  }
  rooms.set(sessionKey, after)
  emitVenueTableState(sessionKey, after, opts)
}

/**
 * Shot clock is host-nudge only. Returns a deadline for the wire when the current
 * acting human has been nudged; clears automatically when the actor changes.
 */
export function syncHumanTurnDeadline(sessionKey: string, gs: GameState): number | undefined {
  const actor = resolveHumanTurnActor(gs)
  if (!actor) {
    clearHumanTurnClock(sessionKey)
    return undefined
  }
  const actorKey = `${actor.playerId}:${actor.seatIndex}`
  const prevActor = humanTurnActorKey.get(sessionKey)
  if (prevActor !== actorKey) {
    // New actor — wait for an explicit host nudge (no always-on clock).
    clearHumanTurnTimerHandle(sessionKey)
    humanTurnDeadlineMs.delete(sessionKey)
    humanTurnActorKey.set(sessionKey, actorKey)
    return undefined
  }
  const deadline = humanTurnDeadlineMs.get(sessionKey)
  return typeof deadline === 'number' && Number.isFinite(deadline) ? deadline : undefined
}

/** Arm auto check/fold only when a host nudge deadline is active for the current actor. */
export function scheduleHumanTurnTimeout(sessionKey: string, gs: GameState): void {
  const actor = resolveHumanTurnActor(gs)
  if (!actor) {
    clearHumanTurnClock(sessionKey)
    return
  }

  const deadline = humanTurnDeadlineMs.get(sessionKey)
  if (deadline == null || !Number.isFinite(deadline)) {
    clearHumanTurnTimerHandle(sessionKey)
    return
  }

  const { seatIndex, playerId, playerName } = actor
  const actorKey = `${actor.playerId}:${actor.seatIndex}`
  if (humanTurnActorKey.get(sessionKey) !== actorKey) {
    clearHumanTurnTimerHandle(sessionKey)
    return
  }

  const delayMs = Math.max(0, deadline - Date.now())
  clearHumanTurnTimerHandle(sessionKey)
  const timer = setTimeout(() => {
    humanTurnTimers.delete(sessionKey)
    let cur = rooms.get(sessionKey) as GameState | undefined
    if (!cur || isVenueHeld(cur.code)) return
    if (cur.phase !== 'betting' || !cur.round.isBettingOpen) return
    if (cur.round.currentPlayerIndex !== seatIndex) return
    const acting = cur.players[seatIndex]
    if (!acting || acting.id !== playerId) return

    const contrib = cur.round.playerBets?.[acting.id] ?? 0
    const toCall = Math.max(0, (cur.round.currentBet ?? 0) - contrib)
    const beforeTimeout = cur
    cur = toCall === 0 ? playerCheck(cur, acting.id) : foldPlayer(cur, acting.id)
    cur = runVirtualPlayerSimulation(cur)
    clearHumanTurnClock(sessionKey)
    commitTableAdvance(sessionKey, beforeTimeout, cur)
    io.to(sessionKey).emit(
      'toast',
      `${shortPlayerName(playerName)} nudged time up — ${toCall === 0 ? 'checked' : 'folded'}.`,
    )
  }, delayMs)
  humanTurnTimers.set(sessionKey, timer)
}

/** Host: start a 30s countdown on every table whose acting seat is a human. */
export function nudgeActingHumansVenue(vnRaw: string): { nudged: number; names: string[] } {
  const vn = normalizeVenueCode(vnRaw)
  const names: string[] = []
  let nudged = 0
  const fireAt = Date.now() + HUMAN_NUDGE_TIMEOUT_MS
  for (const { tk, gs } of venuePlayableSnapshots(vn)) {
    const actor = resolveHumanTurnActor(gs)
    if (!actor) continue
    humanTurnActorKey.set(tk, `${actor.playerId}:${actor.seatIndex}`)
    humanTurnDeadlineMs.set(tk, fireAt)
    nudged += 1
    names.push(shortPlayerName(actor.playerName))
    emitVenueTableState(tk, gs, { skipOrchestration: true })
    io.to(tk).emit(
      'toast',
      `${shortPlayerName(actor.playerName)} — host nudge: 30s to act (then auto check/fold).`,
    )
  }
  return { nudged, names }
}

export function runVenueCondenseAfterRound(
  vnRaw: string,
  hostId: string,
  shuffle: boolean,
): import('./venue-condense').VenueCondenseApplyResult {
  const vn = normalizeVenueCode(vnRaw)
  return applyVenueCondenseAfterRound(
    {
      venueCode: vn,
      hostId,
      io,
      getState: (tk) => rooms.get(tk),
      setState: (tk, gs) => rooms.set(tk, gs),
      tableSessionKey,
      tableNumFromSessionKey,
      allTableSessionKeys: allTableSessionsInVenue,
      applyEffectiveBlinds: applyEffectiveBlindsToGameState,
      emitTableState: emitVenueTableState,
      moveHumanSocket: moveHumanToTableSession,
    },
    { shuffle },
  )
}

/**
 * Phase / street fingerprint for lockstep venues: every playable table session must match
 * before cross-table host actions advance the show together.
 */
export function phaseStrictSignature(gs: GameState): string {
  const r = gs.round
  const phase = gs.phase
  if (phase === 'betting') {
    const br = typeof r?.bettingRound === 'number' && Number.isFinite(r.bettingRound) ? Math.floor(r.bettingRound) : '?'
    const openRaw = r?.isBettingOpen
    const open = openRaw === true ? 'T' : openRaw === false ? 'F' : '?'
    const cc = Array.isArray(r?.communityCards) ? r.communityCards.length : 0
    return `bet|${br}|${open}|cc${cc}`
  }
  // Ignore per-table deadline ms — venue guide is shared; mismatched clocks were false desyncs.
  if (phase === 'answering') return 'answer'
  // Reveal beat and showdown are one post-hand lockstep bucket (8s auto-advance must not block End Round).
  if (phase === 'reveal' || phase === 'showdown') return 'postHand'
  return String(phase)
}

export function humanReadableStrictState(gs: GameState): string {
  const ph = gs.phase
  const r = gs.round
  if (ph === 'betting') {
    const rnd = typeof r?.bettingRound === 'number' ? r.bettingRound : '?'
    const street = rnd === 1 ? 'pre-board' : rnd === 2 ? 'after board' : `round ${String(rnd)}`
    const clock = r?.isBettingOpen === true ? 'clock open' : r?.isBettingOpen === false ? 'clock closed' : 'clock unclear'
    const cc = r?.communityCards?.length ?? 0
    return `${street}, ${clock}, ${cc}/5 board`
  }
  if (ph === 'answering') return 'answer window'
  if (ph === 'reveal') return 'reveal beat'
  if (ph === 'showdown') return 'showdown'
  if (ph === 'question') return 'deal setup'
  if (ph === 'lobby') return 'lobby between hands'
  return ph
}

export function venuePlayableSnapshots(venueCode: string): { tk: string; n: number; gs: GameState }[] {
  const vn = normalizeVenueCode(venueCode)
  const playable = allSeatedTableSessionsInVenue(vn)
  const out: { tk: string; n: number; gs: GameState }[] = []
  for (const tk of playable) {
    const gs = rooms.get(tk)
    if (!gs || gs.players.length === 0) continue
    const tn = tableNumFromSessionKey(vn, tk)
    out.push({ tk, n: tn ?? NaN, gs })
  }
  out.sort((a, b) => {
    const ax = Number.isFinite(a.n) ? a.n : 99
    const bx = Number.isFinite(b.n) ? b.n : 99
    return ax - bx || a.tk.localeCompare(b.tk)
  })
  return out
}

export function normalizeRehearsalTableCount(raw: unknown): number {
  const n = Number(raw ?? VENUE_NUMBERED_TABLE_MAX)
  return Number.isFinite(n)
    ? Math.max(1, Math.min(VENUE_NUMBERED_TABLE_MAX, Math.floor(n)))
    : VENUE_NUMBERED_TABLE_MAX
}

export function seedRehearsalVenueRooms(
  lobbyGs: GameState,
  tableCount: number,
): { vn: string; t1Key: string; tableCount: number; totalBots: number; sizes: readonly number[] } {
  const vn = normalizeVenueCode(lobbyGs.code)
  const hostIdSnap = lobbyGs.hostId
  const sizes = rehearsalVenueTableRosterSizes(tableCount)
  for (const tk of allTableSessionsInVenue(vn)) {
    rooms.delete(tk)
  }
  let globalSeat = 0
  let totalBots = 0
  for (let ti = 0; ti < sizes.length; ti++) {
    const tid = String(ti + 1)
    const tk = tableSessionKey(vn, tid)
    let gsNew = applyEffectiveBlindsToGameState(
      {
        ...createEmptyGame(vn, hostIdSnap, tid),
        smallBlind: lobbyGs.smallBlind,
        bigBlind: lobbyGs.bigBlind,
        maxPlayers: VENUE_WALL_SEAT_SLOTS,
      },
      vn,
      tk,
    )
    const seatN = sizes[ti]!
    for (let si = 0; si < seatN; si++) {
      gsNew = addPlayer(
        gsNew,
        `vp:rehearsal:${tid}:${si}`,
        rehearsalSeatDisplayName(globalSeat),
      )
      globalSeat++
    }
    totalBots += seatN
    rooms.set(tk, gsNew)
    emitVenueTableState(tk, gsNew)
  }
  return { vn, t1Key: tableSessionKey(vn, '1'), tableCount, totalBots, sizes }
}

export function moveVenueHostToTableOne(vn: string, hostId: string, fromSessionKey: string): string {
  const t1Key = tableSessionKey(vn, '1')
  const hostSock = io.sockets.sockets.get(hostId)
  if (hostSock) {
    hostSock.leave(fromSessionKey)
    hostSock.join(t1Key)
    ;(hostSock.data as { sessionKey?: string }).sessionKey = t1Key
    bindSocketAsVenueHost(hostSock, vn)
    hostSock.emit('hostBoundTable', { tableId: '1' })
  }
  return t1Key
}

export async function fastForwardVenueRehearsalToShowdown(
  venueCode: string,
): Promise<{ advanced: number; already: number }> {
  const vn = normalizeVenueCode(venueCode)
  clearVenueWageringOrchestrationState(vn)
  const lib = await ensureVenueLibrary(vn)
  const fallbackQ = rehearsalFallbackQuestion(lib.questions)
  const rows = venuePlayableSnapshots(vn)
  let advanced = 0
  let already = 0
  for (const { tk } of rows) {
    const before = rooms.get(tk)
    if (!before || before.players.length === 0) continue
    if (before.phase === 'showdown' || before.phase === 'reveal') {
      already++
      continue
    }
    const after = fastForwardTableToShowdown(before, fallbackQ)
    rooms.set(tk, after)
    emitVenueTableState(tk, after, { skipOrchestration: true })
    advanced++
  }
  markVenueShowStarted(vn)
  venueAudienceWelcomeExpired.add(vn)
  emitDisplayVenueSnapshotNow(vn)
  return { advanced, already }
}

export function toastVenueMisaligned(socket: Socket, rows: { n: number; gs: GameState }[]): void {
  const seenSig = new Set<string>()
  const parts: string[] = []
  for (const row of rows) {
    const sig = phaseStrictSignature(row.gs)
    if (seenSig.has(sig)) continue
    seenSig.add(sig)
    const nums = rows
      .filter((r) => phaseStrictSignature(r.gs) === sig)
      .map((r) => (Number.isFinite(r.n) ? String(r.n) : '?'))
      .sort()
    parts.push(`${nums.join(',')}→${humanReadableStrictState(row.gs)}`)
  }
  const detail = parts.join(' · ')
  console.warn(`[venue-lockstep] out of sync code=${rows[0]?.gs?.code ?? '?'} ${detail}`)
  socket.emit(
    'toast',
    `Tables are out of sync (${detail}). Fix the stragglers so every felt matches before advancing.`,
  )
}

/**
 * Ensures every existing numbered session in `venueCode` shares the same strict phase fingerprint
 * and satisfies `predicate` for the initiating action — otherwise emits a toast and returns null.
 */
export function requireVenueLockstepTables(
  socket: Socket,
  venueCode: string,
  predicate: (gs: GameState) => boolean,
  readinessHint: string
): { tk: string; n: number; gs: GameState }[] | null {
  const rows = venuePlayableSnapshots(venueCode)
  if (rows.length === 0) {
    socket.emit('toast', 'No playable tables yet — assign the lobby first.')
    return null
  }
  const sig0 = phaseStrictSignature(rows[0].gs)
  for (let i = 1; i < rows.length; i++) {
    if (phaseStrictSignature(rows[i].gs) !== sig0) {
      toastVenueMisaligned(socket, rows)
      return null
    }
  }
  if (!predicate(rows[0].gs)) {
    const found = humanReadableStrictState(rows[0].gs)
    socket.emit('toast', `Every table must ${readinessHint} (yours collectively: ${found}).`)
    return null
  }
  return rows
}

/**
 * Every seated table must satisfy `predicate` (no signature match).
 * Use when the action normalizes per-table differences (e.g. auto-close round 1 before dealing the board).
 */
export function requireAllSeatedTablesSatisfy(
  socket: Socket,
  venueCode: string,
  predicate: (gs: GameState) => boolean,
  readinessHint: string
): { tk: string; n: number; gs: GameState }[] | null {
  const rows = venuePlayableSnapshots(venueCode)
  if (rows.length === 0) {
    socket.emit('toast', 'No playable tables yet — assign the lobby first.')
    return null
  }
  const bad = rows.filter((r) => !predicate(r.gs))
  if (bad.length > 0) {
    const nums = bad
      .map((r) => (Number.isFinite(r.n) ? String(r.n) : '?'))
      .sort((a, b) => Number(a) - Number(b))
      .join(', ')
    const sample = humanReadableStrictState(bad[0]!.gs)
    socket.emit(
      'toast',
      `Tables ${nums} must ${readinessHint} (e.g. ${sample}). Close wagering round 1 on stragglers or align the venue, then try again.`,
    )
    return null
  }
  return rows
}

/** Phases where the current hand’s `round.question` should drive the shared venue-wall headline strip. */
export const VENUE_WALL_HEADLINE_PHASES = new Set<string>([
  'question',
  'betting',
  'answering',
  'reveal',
  'showdown',
  'payout',
])

/**
 * Prefer the most “interesting” numbered felt for the shared TV headline bar:
 * answering (with deadline) → question setup → wagering (same question persists) → showdown family → fallback first seated table (may be lobby).
 */
export function pickVenueHeadlineSource(venueCode: string): { gs: GameState; tableNum: number } | null {
  const vn = normalizeVenueCode(venueCode)

  function firstSeated(predicate: (gs: GameState) => boolean): { gs: GameState; tableNum: number } | null {
    for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
      const key = tableSessionKey(vn, String(n))
      const gs = rooms.get(key)
      if (gs != null && gs.players.length > 0 && predicate(gs)) return { gs, tableNum: n }
    }
    return null
  }

  const answering = firstSeated(
    (gs) =>
      gs.phase === 'answering' &&
      gs.round?.answerDeadline != null &&
      Number.isFinite(gs.round.answerDeadline)
  )
  if (answering) return answering

  const question = firstSeated((gs) => gs.phase === 'question')
  if (question) return question

  const wagering = firstSeated((gs) => {
    if (gs.phase !== 'betting') return false
    const t = gs.round?.question?.text
    return typeof t === 'string' && t.trim() !== ''
  })
  if (wagering) return wagering

  const post = firstSeated(
    (gs) => gs.phase === 'reveal' || gs.phase === 'showdown' || gs.phase === 'payout'
  )
  if (post) return post

  for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
    const key = tableSessionKey(vn, String(n))
    const gs = rooms.get(key)
    if (gs != null && gs.players.length > 0) return { gs, tableNum: n }
  }
  return null
}

export function buildHostVenueFeltBeatPayload(vnRaw: string): { felts: HostVenueFeltBeatRow[] } {
  const vn = normalizeVenueCode(vnRaw)
  const felts: HostVenueFeltBeatRow[] = []
  for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
    const key = tableSessionKey(vn, String(n))
    const gs = rooms.get(key) as GameState | undefined
    if (!gs) {
      felts.push({
        tableNum: n,
        active: false,
        seated: 0,
        phase: 'inactive',
        street: '—',
        clock: '—',
        answerDeadlineMs: null,
        phaseStrictSig: null,
        questionText: null,
        questionAnswer: null,
      })
      continue
    }
    const seated = welcomeWallSeatCount(gs)
    const phase = gs.phase
    let street = '—'
    let clock = '—'
    let answerDeadlineMs: number | null = null

    if (phase === 'betting') {
      const br = typeof gs.round.bettingRound === 'number' ? Math.floor(gs.round.bettingRound) : 0
      const cc = gs.round.communityCards?.length ?? 0
      street = br === 1 ? 'Pre-board' : br === 2 ? `Board ${cc}/5` : `Bet rnd ${br}`
      if (gs.round.isBettingOpen === true) clock = 'Clock open'
      else if (gs.round.isBettingOpen === false) clock = 'Clock closed'
      else clock = 'Clock unclear'
    } else if (phase === 'answering') {
      street = 'Trivia lock-in'
      const dl = gs.round.answerDeadline
      answerDeadlineMs =
        typeof dl === 'number' && Number.isFinite(dl) ? Math.floor(dl) : null
      clock = answerDeadlineMs != null ? 'Countdown' : '—'
    } else if (phase === 'showdown') {
      street = 'Showdown'
      clock = '—'
    } else if (phase === 'lobby') {
      street = 'Between hands'
      clock = '—'
    } else if (phase === 'question') {
      street = 'Deal setup'
      clock = '—'
    } else {
      street = phase
    }

    felts.push({
      tableNum: n,
      active: seated > 0,
      seated,
      phase,
      street,
      clock,
      answerDeadlineMs,
      phaseStrictSig: phaseStrictSignature(gs),
      questionText: gs.round.question?.text?.trim() || null,
      questionAnswer:
        gs.round.question != null && Number.isFinite(gs.round.question.answer)
          ? gs.round.question.answer
          : null,
    })
  }
  return { felts }
}

export function emitDisplayVenueSnapshotNow(vnRaw: string) {
  const vn = normalizeVenueCode(vnRaw)
  const lobbyKey = tableSessionKey(vn, LOBBY_TABLE_ID)
  const lobbyGs = rooms.get(lobbyKey)
  const lobbyPlayerCount = lobbyGs != null ? welcomeWallSeatCount(lobbyGs) : 0

  const tiles: DisplayVenueTileSnapshot[] = []
  let totalSeatedAtTables = 0
  const tableKeys = allTableSessionsInVenue(vn).sort((a, b) => {
    const na = tableNumFromSessionKey(vn, a) ?? 99
    const nb = tableNumFromSessionKey(vn, b) ?? 99
    return na - nb
  })
  for (const key of tableKeys) {
    const n = tableNumFromSessionKey(vn, key)
    if (n == null) continue
    let gs = rooms.get(key)
    if (!gs) continue
    if (gs.phase === 'betting') {
      const normalized = normalizeBettingTurn(gs)
      if (normalized !== gs) {
        rooms.set(key, normalized)
        gs = normalized
      }
    }
    const seated = welcomeWallSeatCount(gs)
    if (seated === 0) continue
    totalSeatedAtTables += seated
    const seatNames = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      if (p == null) return ''
      const nm = typeof p.name === 'string' ? p.name.trim() : ''
      return nm
    })
    const seatBankrolls = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      if (p == null) return 0
      const br = p.bankroll
      return typeof br === 'number' && Number.isFinite(br) ? br : 0
    })
    const seatFolded = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      return p != null && p.hasFolded === true
    })
    const seatPointsOnly = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      return p != null && p.pointsOnly === true
    })
    const seatAnswerPoints = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      if (p == null) return 0
      const pts = p.answerPoints
      return typeof pts === 'number' && Number.isFinite(pts) ? Math.max(0, Math.floor(pts)) : 0
    })
    const seatLastBettingAction = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const arr = gs.round.lastSeatBettingAction
      if (arr != null && i < arr.length) {
        const v = arr[i]
        return v === undefined || v === null ? null : v
      }
      return null
    })
    let actingCallAmount: number | null = null
    let actingCallPctOfStack: number | null = null
    if (gs.phase === 'betting' && gs.round.isBettingOpen !== false) {
      const idx =
        typeof gs.round.currentPlayerIndex === 'number' && Number.isFinite(gs.round.currentPlayerIndex)
          ? Math.floor(gs.round.currentPlayerIndex)
          : -1
      if (idx >= 0 && idx < gs.players.length) {
        const actor = gs.players[idx]
        if (actor && !actor.hasFolded && !actor.isAllIn) {
          actingCallAmount = chipsRequiredToCall(gs, actor.id)
          actingCallPctOfStack = pctOfStackToCall(gs, actor.id)
        }
      }
    }
    const interestingAction =
      seated >= 2 &&
      ((gs.phase === 'betting' && gs.round.isBettingOpen === true) ||
        gs.phase === 'answering' ||
        gs.phase === 'reveal' ||
        gs.phase === 'showdown')
    const blindEff = effectiveBlindsForSessionKey(vn, key)
    const seatHoleDigits = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      // Hide folded holes until showdown so mucked cards stay private during betting.
      if (
        p == null ||
        p.hand.length < 2 ||
        (p.hasFolded && gs.phase !== 'showdown' && gs.phase !== 'reveal')
      ) {
        return null
      }
      const d0 = p.hand[0]?.digit
      const d1 = p.hand[1]?.digit
      if (
        typeof d0 !== 'number' ||
        typeof d1 !== 'number' ||
        !Number.isInteger(d0) ||
        !Number.isInteger(d1) ||
        d0 < 0 ||
        d0 > 9 ||
        d1 < 0 ||
        d1 > 9
      ) {
        return null
      }
      return [d0, d1] as [number, number]
    })
    const communityDigits =
      gs.round.communityCards.length > 0
        ? gs.round.communityCards.map((c: { digit: number }) => c.digit)
        : undefined
    let showdownAnswer: number | null | undefined
    let showdownQuestionText: string | null | undefined
    let seatSubmittedAnswers: (number | null)[] | undefined
    let seatAnswerLocked: boolean[] | undefined
    let seatAnswerCommunityIndices: (readonly number[] | null)[] | undefined
    let seatAnswerCompositions:
      | (readonly { source: 'hole' | 'community'; index: number }[] | null)[]
      | undefined
    let seatChipPayout: (number | null)[] | undefined
    if (gs.phase === 'answering') {
      // Privacy: never leak numeric guesses on the public wire during answering.
      seatAnswerLocked = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
        const p = gs.players[i]
        return p != null && typeof p.submittedAnswer === 'number' && Number.isFinite(p.submittedAnswer)
      })
    }
    if (gs.phase === 'showdown' || gs.phase === 'reveal') {
      seatSubmittedAnswers = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
        const p = gs.players[i]
        if (p == null) return null
        const sa = p.submittedAnswer
        return typeof sa === 'number' && Number.isFinite(sa) ? sa : null
      })
    }
    if (gs.phase === 'showdown' || gs.phase === 'reveal') {
      const q = gs.round.question
      if (q != null && typeof q.answer === 'number' && Number.isFinite(q.answer)) {
        showdownAnswer = q.answer
        const qt = q.text
        showdownQuestionText = typeof qt === 'string' && qt.trim() !== '' ? qt.trim() : null
      }
      seatAnswerCommunityIndices = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
        const p = gs.players[i]
        if (p == null || typeof p.submittedAnswer !== 'number') return null
        const comp = answerCompositionForPlayer(p, gs.round.communityCards)
        if (comp == null) return null
        const idx = communityIndicesFromAnswerComposition(comp)
        return idx.length > 0 ? idx : null
      })
      seatAnswerCompositions = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
        const p = gs.players[i]
        if (p == null || typeof p.submittedAnswer !== 'number') return null
        const comp = answerCompositionForPlayer(p, gs.round.communityCards)
        return comp != null && comp.length === PLAYER_ANSWER_DIGIT_CARD_COUNT ? comp : null
      })
      const payoutById = previewChipPayoutByPlayerId(gs)
      seatChipPayout = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
        const p = gs.players[i]
        if (p == null) return null
        const amt = payoutById[p.id]
        return typeof amt === 'number' && Number.isFinite(amt) && amt > 0 ? Math.round(amt) : null
      })
    }
    tiles.push({
      tableNum: n,
      seated,
      pot: venueWallDisplayPot(gs),
      phase: gs.phase,
      seatNames,
      seatBankrolls,
      seatFolded,
      seatPointsOnly,
      seatAnswerPoints,
      seatLastBettingAction,
      actingCallAmount,
      actingCallPctOfStack,
      ...(seatHoleDigits.some((h) => h != null) ? { seatHoleDigits } : {}),
      ...(communityDigits != null && communityDigits.length > 0 ? { communityDigits } : {}),
      ...(showdownAnswer != null ? { showdownAnswer, showdownQuestionText: showdownQuestionText ?? null } : {}),
      ...(seatSubmittedAnswers != null ? { seatSubmittedAnswers } : {}),
      ...(seatAnswerLocked != null ? { seatAnswerLocked } : {}),
      ...(seatAnswerCommunityIndices != null &&
      seatAnswerCommunityIndices.some((x) => x != null && x.length > 0)
        ? { seatAnswerCommunityIndices }
        : {}),
      ...(seatAnswerCompositions != null &&
      seatAnswerCompositions.some((x) => x != null && x.length > 0)
        ? { seatAnswerCompositions }
        : {}),
      ...(seatChipPayout != null && seatChipPayout.some((x) => x != null && x > 0)
        ? { seatChipPayout }
        : {}),
      ...displayBlindSeatIndices(seated, gs.round.dealerIndex),
      currentPlayerIndex:
        typeof gs.round.currentPlayerIndex === 'number' && Number.isFinite(gs.round.currentPlayerIndex)
          ? Math.floor(gs.round.currentPlayerIndex)
          : null,
      isBettingOpen: gs.phase === 'betting' ? gs.round.isBettingOpen === true : null,
      bettingRound:
        gs.phase === 'betting' && typeof gs.round.bettingRound === 'number' && Number.isFinite(gs.round.bettingRound)
          ? Math.floor(gs.round.bettingRound)
          : null,
      actingSeatIndex:
        gs.phase === 'betting' && gs.round.isBettingOpen === true
          ? displayActingSeatIndex(gs.phase, seated, gs.round)
          : null,
      smallBlind: blindEff.smallBlind,
      bigBlind: blindEff.bigBlind,
      ...(blindEff.isTableOverride ? { blindsTableOverride: true } : {}),
      ...(interestingAction ? { interestingAction: true } : {}),
    })
  }

  const blindsSnap = hostLibraryBlindsPayload(vn)
  syncVenueAudienceWelcomeFromTiles(vn, tiles)

  const headlineSource = pickVenueHeadlineSource(vn)
  const headlineGs = headlineSource?.gs ?? null
  let headlineQuestionText: string | null = null
  let headlineQuestionAnswer: number | null = null
  let headlineAnswerComposition: readonly { source: 'hole' | 'community'; index: number }[] | null =
    null
  let answerDeadlineMs: number | null = null
  let headlineTableNum: number | null = null
  let headlinePhase: string | null = null
  if (headlineGs != null && VENUE_WALL_HEADLINE_PHASES.has(headlineGs.phase)) {
    headlineTableNum = headlineSource?.tableNum ?? null
    headlinePhase = headlineGs.phase
    const q = headlineGs.round?.question
    if (q != null && typeof q.text === 'string' && q.text.trim() !== '') {
      headlineQuestionText = q.text.trim()
    }
    if (q != null && typeof q.answer === 'number' && Number.isFinite(q.answer)) {
      headlineQuestionAnswer = q.answer
      if (headlineGs.round.communityCards.length >= 5) {
        for (const p of headlineGs.players) {
          if (p.hand.length < 2) continue
          const comp = answerCompositionForPlayer(p, headlineGs.round.communityCards)
          if (comp != null && comp.length === PLAYER_ANSWER_DIGIT_CARD_COUNT) {
            headlineAnswerComposition = comp
            break
          }
          const inferred = inferAnswerComposition(
            p.hand,
            headlineGs.round.communityCards,
            q.answer
          )
          if (inferred != null && inferred.length === PLAYER_ANSWER_DIGIT_CARD_COUNT) {
            headlineAnswerComposition = inferred
            break
          }
        }
      }
    }
    if (headlineGs.phase === 'answering') {
      const venueDeadline = venueShowdownAtMs.get(vn)
      const tableDeadline = headlineGs.round?.answerDeadline
      if (venueDeadline != null && Number.isFinite(venueDeadline)) {
        answerDeadlineMs = venueDeadline
      } else if (typeof tableDeadline === 'number' && Number.isFinite(tableDeadline)) {
        answerDeadlineMs = tableDeadline
      }
    }
  }

  let setlistCueNumber: number | null = null
  let setlistCueTotal: number | null = null
  if (headlineQuestionText != null) {
    const ph = getPlayhead(vn)
    const lib = venueLibraries.get(vn)
    if (ph.setlistId && lib) {
      const sl = lib.setlists.find((s) => s.id === ph.setlistId)
      if (sl && sl.questionIds.length > 0) {
        setlistCueTotal = sl.questionIds.length
        if (ph.nextIndex > 0 && ph.nextIndex <= sl.questionIds.length) {
          setlistCueNumber = ph.nextIndex
        }
      }
    }
  }

  const condenseCounts = venueCondenseSnapshotFromRooms({
    venueCode: vn,
    getState: (tk) => rooms.get(tk),
    tableNumFromSessionKey,
    allTableSessionKeys: allTableSessionsInVenue,
  })
  const shuffleDisplay = venueShuffleDisplayFields({
    handsCompletedAtVenue: getVenueHandsCompleted(vn),
    liveTableCount: condenseCounts.liveTableCount,
    every: getVenueShuffleEvery(vn),
    skipNext: isVenueShuffleHeld(vn),
  })

  const lastHandDisplay = getVenueLastHandDisplay(vn)

  let answerSubmitCount: number | null = null
  let answerEligibleCount: number | null = null
  if (headlinePhase === 'answering') {
    let locked = 0
    let eligible = 0
    for (const t of tiles) {
      if (t.phase !== 'answering') continue
      const names = t.seatNames ?? []
      for (let i = 0; i < names.length; i++) {
        if (!names[i]?.trim()) continue
        eligible++
        if (t.seatAnswerLocked?.[i] === true) locked++
      }
    }
    answerSubmitCount = locked
    answerEligibleCount = eligible
  }

  const postHandBeatStartedAtMs = venuePostHandBeatStartedAtMs.get(vn) ?? null

  const payload: DisplayVenueWallSnapshot = {
    tiles,
    headlineQuestionText,
    headlineQuestionAnswer,
    headlineAnswerComposition,
    answerDeadlineMs,
    answerSubmitCount,
    answerEligibleCount,
    postHandBeatStartedAtMs,
    headlineTableNum,
    headlinePhase,
    setlistCueNumber,
    setlistCueTotal,
    venueSmallBlind: blindsSnap.smallBlind,
    venueBigBlind: blindsSnap.bigBlind,
    blindLevelNumber: blindsSnap.blindLevelIndex + 1,
    blindLevelCount: blindsSnap.blindLevelCount,
    handsUntilNextBlindLevel: blindsSnap.handsUntilNextLevel,
    /** Anchor the client's countdown to server time so a skewed laptop clock doesn't start the 45s timer at 47–48s. */
    serverNowMs: Date.now(),
    lobbyPlayerCount,
    totalSeatedAtTables,
    showAudienceWelcome: !venueAudienceWelcomeExpired.has(vn),
    seatingChartPinnedUntilMs: venueSeatingChartPinnedUntilMs.get(vn) ?? null,
    venueLiveTableCount: condenseCounts.liveTableCount,
    venueChipSurvivorCount: condenseCounts.chipSurvivorCount,
    venueHandsUntilShuffle: shuffleDisplay.handsUntilShuffle,
    venueShuffleEveryHands: shuffleDisplay.shuffleEveryHands,
    venueHeld: isVenueHeld(vn),
    venueShuffleHeld: isVenueShuffleHeld(vn),
    ...(lastHandDisplay != null &&
    (lastHandDisplay.busts.length > 0 ||
      (lastHandDisplay.seating != null &&
        (lastHandDisplay.seating.shuffled ||
          lastHandDisplay.seating.moves.length > 0 ||
          lastHandDisplay.seating.closedTableNums.length > 0)))
      ? {
          lastHandEndMs: lastHandDisplay.endMs,
          ...(lastHandDisplay.busts.length > 0
            ? {
                lastHandBusts: lastHandDisplay.busts.map((b) => ({
                  name: b.name,
                  tableNum: b.tableNum,
                })),
              }
            : {}),
          ...(lastHandDisplay.seating != null ? { lastHandSeating: lastHandDisplay.seating } : {}),
        }
      : {}),
  }
  io.to(displayVenueRoom(vn)).emit('displayVenueSnapshot', payload)
  emitPlayerVenueBriefNow(vn)
  const livelyTableNums = tiles
    .filter((t) => t.interestingAction === true)
    .map((t) => t.tableNum)
    .sort((a, b) => a - b)
  io.to(hostVenueRoom(vn)).emit('hostVenueGameplayHints', { livelyTableNums })
  io.to(hostVenueRoom(vn)).emit('hostVenueFeltBeat', buildHostVenueFeltBeatPayload(vn))
  io.to(hostVenueRoom(vn)).emit(
    'hostVenueFloorBrief',
    buildHostVenueFloorBrief({
      venueCode: vn,
      tiles,
      fieldPlayerCount: condenseCounts.chipSurvivorCount,
      liveTableCount: condenseCounts.liveTableCount,
      bigBlindHint: blindsSnap.bigBlind,
      roster: venueRosterSeats(vn),
      venueHeld: isVenueHeld(vn),
      shuffleEveryHands: shuffleDisplay.shuffleEveryHands,
      venueShuffleHeld: isVenueShuffleHeld(vn),
      handsUntilShuffle: shuffleDisplay.handsUntilShuffle,
    }),
  )
}

export function afterTableStateBroadcast(gs: GameState, _sessionKey: string) {
  /** Immediate refresh — debouncing was dropping every intermediate state during VP sims. */
  emitDisplayVenueSnapshotNow(gs.code)
}

/** Emit felt state then refresh DISPLAY:{venue} wall summaries for numbered felts */
export function emitVenueTableState(
  sessionKey: string,
  gs: GameState,
  opts?: { skipOrchestration?: boolean }
) {
  const turnDeadlineMs = syncHumanTurnDeadline(sessionKey, gs)
  io.to(sessionKey).emit('state', {
    ...gs,
    serverNowMs: Date.now(),
    playerOnline: buildPlayerOnlineMap(gs),
    round: { ...gs.round, turnDeadlineMs },
  })
  scheduleHumanTurnTimeout(sessionKey, gs)
  afterTableStateBroadcast(gs, sessionKey)
  if (!opts?.skipOrchestration) {
    applyVenueWageringOrchestration(gs.code)
  }
}

/** Presence-only refresh after connect/disconnect (no wagering orchestration). */
export function emitTablePresence(sessionKey: string): void {
  const gs = rooms.get(sessionKey) as GameState | undefined
  if (!gs) return
  emitVenueTableState(sessionKey, gs, { skipOrchestration: true })
}

/**
 * Pure `vp:*` felts — advance one bot step at a time with a human-visible pause so the
 * venue wall can be read between decisions (demo / watch mode).
 */
export const cpuVpDrainPending = new Set<string>()
/** One wagering/answering VP step per timer tick (not 72 micro-steps at once). */
export const CPU_VP_STEPS_PER_CHUNK = 1

/**
 * Pace between paced CPU-only wagering steps (`drainCpuVpSessionChain`).
 * Default ~3–7s random so the venue wall stays readable during demos.
 * Set **`QHE_CPU_VP_ACTION_DELAY_MS`** on the server to a nonnegative integer (e.g. `0` or `50`)
 * when rehearsing large all-CPU fields (many seats × multiple felts → venue lockstep).
 */
export function cpuVpDelayMsBetweenActions(): number {
  const raw = process.env.QHE_CPU_VP_ACTION_DELAY_MS?.trim()
  if (raw !== undefined && raw !== '') {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 0) return Math.min(n, 120_000)
  }
  const min = 3000
  const max = 7000
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function enqueueCpuOnlyVpDrain(sessionKey: string) {
  if (cpuVpDrainPending.has(sessionKey)) return
  cpuVpDrainPending.add(sessionKey)
  setImmediate(() => drainCpuVpSessionChain(sessionKey))
}

export function drainCpuVpSessionChain(sessionKey: string) {
  let gs = rooms.get(sessionKey)
  if (!gs || !tableIsCpuOnly(gs)) {
    cpuVpDrainPending.delete(sessionKey)
    return
  }

  const beforeDrain = gs
  let s = gs
  let steps = 0
  while (steps < CPU_VP_STEPS_PER_CHUNK) {
    const next = advanceVirtualBettingStep(s)
    if (next === s) break
    s = next
    steps++
  }

  if (steps > 0) {
    commitTableAdvance(sessionKey, beforeDrain, s)
  } else {
    rooms.set(sessionKey, s)
    emitVenueTableState(sessionKey, s)
  }

  gs = rooms.get(sessionKey)
  if (!gs || !tableIsCpuOnly(gs)) {
    cpuVpDrainPending.delete(sessionKey)
    return
  }

  if (steps === 0 && gs.phase === 'betting' && gs.round.isBettingOpen === true) {
    const normalized = normalizeBettingTurn(gs)
    if (normalized !== gs) {
      rooms.set(sessionKey, normalized)
      emitVenueTableState(sessionKey, normalized)
      setTimeout(() => drainCpuVpSessionChain(sessionKey), 0)
      return
    }
    // Never run full runVirtualPlayerSimulation here — it collapses the whole street in one tick
    // so host/TV never show wagering even though the felt advanced.
  }

  const hitChunkCap = steps === CPU_VP_STEPS_PER_CHUNK
  if (hitChunkCap) {
    setTimeout(() => drainCpuVpSessionChain(sessionKey), cpuVpDelayMsBetweenActions())
  } else {
    cpuVpDrainPending.delete(sessionKey)
  }
}

export function applyQuestionToAllPlayable(venueCode: string, picked: Question): boolean {
  const vn = normalizeVenueCode(venueCode)
  venueSeatingChartPinnedUntilMs.delete(vn)
  const playable = allSeatedTableSessionsInVenue(vn)
  for (const tk of playable) {
    let gs = rooms.get(tk)!
    gs = setQuestion(gs, picked)
    gs = runVirtualPlayerSimulation(gs)
    rooms.set(tk, gs)
    emitVenueTableState(tk, gs!)
  }
  return openBettingAfterQuestionOnVenue(venueCode)
}

/** Deal hole cards on every seated table in question setup (no blinds yet). */
export function autoDealHoleCardsOnVenue(venueCode: string): boolean {
  const vn = normalizeVenueCode(venueCode)
  const rows = venuePlayableSnapshots(vn)
  if (rows.length === 0) return false
  if (!rows.every((r) => r.gs.phase === 'question' && r.gs.round.question != null)) return false

  let anyDealt = false
  for (const { tk } of rows) {
    let gs = rooms.get(tk)
    if (!gs || gs.phase !== 'question' || gs.round.question == null || gs.players.length === 0) continue
    if (playersHaveHoleCards(gs)) continue
    gs = dealHoleCards(gs)
    anyDealt = true
    rooms.set(tk, gs)
    io.to(tk).emit('dealingCards')
    const holeTableNum = tableNumFromSessionKey(gs.code, tk)
    if (holeTableNum != null) {
      io.to(displayVenueRoom(vn)).emit('dealingCards', { tableNum: holeTableNum })
    }
    emitVenueTableState(tk, gs)
  }
  return anyDealt
}

/** Post blinds and open wagering round 1 after trivia is revealed. */
export function openBettingAfterQuestionOnVenue(venueCode: string): boolean {
  const vn = normalizeVenueCode(venueCode)
  const rows = venuePlayableSnapshots(vn)
  if (rows.length === 0) return false
  if (!rows.every((r) => r.gs.phase === 'question' && r.gs.round.question != null)) return false

  clearVenueWageringOrchestrationState(vn)
  let anyOpened = false
  for (const { tk } of rows) {
    let gs = rooms.get(tk)
    if (!gs || gs.phase !== 'question' || gs.round.question == null || gs.players.length === 0) continue
    if (!playersHaveHoleCards(gs)) continue
    gs = openBettingRound1(gs)
    if (gs.phase !== 'betting') continue
    anyOpened = true
    rooms.set(tk, gs)
    emitVenueTableState(tk, gs)
    if (tableIsCpuOnly(gs)) {
      enqueueCpuOnlyVpDrain(tk)
    } else {
      gs = runVirtualPlayerSimulation(gs)
      rooms.set(tk, gs)
      emitVenueTableState(tk, gs)
    }
  }
  return anyOpened
}

/** Host controls that apply everywhere in the venue — rosters/hand/pot stay separate per session key. */
export const VENUE_SYNC_ACTION_TYPES = new Set<string>([
  'startGame',
  'setQuestion',
  'nextQuestionFromSetlist',
  'dealInitialCards',
  'dealCommunityCards',
  'startAnswering',
  'revealAnswer',
  'endRound',
  'newGame',
  'adminSetBlinds',
  'adminCloseBetting',
  'nudgeActingPlayers',
  'assignTablesFromLobby',
  'movePlayerToTable',
  'setVenueHold',
  'setVenueShuffleEvery',
  'setVenueSkipNextShuffle',
  'shuffleTablesNow',
])

export async function prepareVenuePersistence(): Promise<string> {
  venueLibraries = await loadVenueLibraries()
  const dbMode = process.env.DATABASE_URL?.trim()
    ? 'PostgreSQL (DATABASE_URL)'
    : 'SQLite file (VENUE_DATABASE_PATH or default under apps/server/data)'
  console.log(`📚 Venue libraries: ${dbMode}`)
  initAnswerWindowEnvDefault()
  loadVenueAnswerWindowSettingsFromDisk()
  loadVenueBlindSettingsFromDisk()
  loadVenueShuffleSettingsFromDisk()
  console.log(
    '⏱️ Trivia answer guide countdown: default from ANSWER_WINDOW_SECONDS (see server); host reveal closes answers (venue overrides in data/venue-answer-settings.json).',
  )
  console.log(
    '💰 Venue blinds: defaults 10/20 with level schedule; overrides in data/venue-blind-settings.json.',
  )
  return dbMode
}
