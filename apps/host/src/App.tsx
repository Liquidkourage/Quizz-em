import { useEffect, useState, useRef, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChipText, NeonButton } from '@qhe/ui'
import {
  connect,
  onState,
  onToast,
  onHostLibrary,
  onHostBoundTable,
  onHostVenueGameplayHints,
  onHostVenueFeltBeat,
  onHostVenueFloorBrief,
  useSocket,
  onSocketConnectionStatus,
  getSocketConnectionStatus,
  startConnectionKeepalive,
  type SocketConnectionStatus,
  startAnswering,
  adminAdvanceTurn,
  adminCloseBetting,
  alignTablesToRoom,
  setTablePhase,
  nudgeActingPlayers,
  addVirtualPlayers,
  clearVirtualPlayers,
  clearTableBlinds,
  seedRehearsalVenue,
  rehearsalPreviewWinnerScreen,
  rehearsalSkipToShowdown,
  assignTablesFromLobby,
  movePlayerToTable,
  removePlayer as removePlayerFromEvent,
  setVenueHold,
  setVenueShuffleEvery,
  setVenueSkipNextShuffle,
  shuffleTablesNow,
  displaySetLayout,
  onHostDisplays,
  pairDisplayWithHost,
  releaseDisplay,
  setVenueAnswerWindowSeconds,
  setVenueBlinds,
  setVenueBlindStructure,
  setTableBlinds,
  setQuestion as pushQuestionToVenue,
  questionBankAdd,
  questionBankUpdate,
  nextQuestionFromSetlist,
  selectTriviaSetlist,
  setlistSave,
} from '@qhe/net'
import type { BlindCall, GameState, Question } from '@qhe/core'
import { HostBlindCall } from './HostBlindCall'
import type { HostDisplayRoster, HostVenueFeltBeatRow, HostVenueFloorBriefPayload } from '@qhe/net'
import { formatTriviaNumber, LOBBY_TABLE_ID, VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { hostContestReasonLabel, hostContestStatus } from './hostContestStatus'
import { readHostVenueCode } from './hostVenueCode'
import {
  HostCollapsible,
  HostBlindsControls,
  HostVenueFloorBriefPanel,
  publicDisplaySoloTable,
  HostVenueMoveLogPanel,
  HostContestBadge,
  HostLiveQuestionCard,
  buildHostPhaseDockItems,
  formatVenueBlindsSummary,
  hostDeskStateWithLiveQuestion,
  hostFloorLockstepMisaligned,
  hostHeaderPhaseDisplay,
  resolveRunOfShowStepForHost,
} from './hostDeskLayout'
import { suggestHostMode, type HostMode } from './hostMode'
import { HostModeNav } from './HostModeNav'
import { HostDeskShell } from './HostDeskShell'
import { hostDeskFrameStyle } from './hostDeskScale'
import { HostMoreMenu } from './HostMoreMenu'
import { HostPreShowPanel } from './HostPreShowPanel'
import { HostRoomControls } from './HostRoomControls'
import { HostLivePanel } from './HostLivePanel'
import { HostQuestionsPanel } from './HostQuestionsPanel'
import {
  hostCloseBettingGate,
  hostDealCommunityGate,
  hostStartAnswerGate,
} from './hostVenueActionGates'
import { HOST_VENUE_ALERT_MS, hostVenueAutoAlertFromToast } from './hostVenueAutoAlerts'
import { useHostVenueAutoAlerts } from './useHostVenueAutoAlerts'
import HostVenueAutoAlertBanner from './HostVenueAutoAlertBanner.tsx'
import type { HostVenueAutoAlert } from './hostVenueAutoAlerts'
import { suggestNextHostAction } from './hostPacingCopilot'

/** Host UI: "First L." from full name; unchanged for single tokens and CPU seats */
function hostPlayerLabel(raw: string): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!s) return '—'
  const parts = s.split(' ')
  if (parts[0].toUpperCase() === 'CPU' && parts.length >= 2) return s
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const last = parts[parts.length - 1]
  if (/^[A-Za-z]\.?$/i.test(last)) {
    const L = last.replace(/\./g, '').charAt(0).toUpperCase()
    return `${first} ${L}.`
  }
  const m = last.match(/[A-Za-z]/)
  const L = m ? m[0].toUpperCase() : ''
  return L ? `${first} ${L}.` : first
}

function openVenueWindow(path: 'display' | 'player', roomCode: string) {
  const url = new URL(`/${path}/`, window.location.origin)
  url.searchParams.set('room', roomCode.trim().toUpperCase())
  window.open(url.toString(), `qhe-${path}`)
}

/** Match server clamp in apps/server venue-answer-window-settings. */
function clampVenueAnswerWindow(v: number): number {
  return Math.min(300, Math.max(15, Math.floor(Number.isFinite(v) ? v : 45)))
}

function HostApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVenueAlert, setToastVenueAlert] = useState<HostVenueAutoAlert | null>(null)
  const [virtualAddCount, setVirtualAddCount] = useState(2)
  const [rehearsalTableCount, setRehearsalTableCount] = useState(VENUE_NUMBERED_TABLE_MAX)
  const [hostVenueCode] = useState(readHostVenueCode)
  const [hostTableId, setHostTableId] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('table') ?? LOBBY_TABLE_ID
      : LOBBY_TABLE_ID
  )
  /** Hello table. Server-side binds (assign, refresh) must not reconnect — that drops live listeners. */
  const [socketTableId, setSocketTableId] = useState(hostTableId)
  const socket = useSocket()

  const [questionBank, setQuestionBank] = useState<Question[]>([])
  const [setlists, setSetlists] = useState<
    Array<{ id: string; name: string; questionIds: string[] }>
  >([])
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null)
  const [activeSetlistNextIndex, setActiveSetlistNextIndex] = useState(0)
  const [setlistDraftId, setSetlistDraftId] = useState<string | null>(null)
  const [qbText, setQbText] = useState('')
  const [qbAnswer, setQbAnswer] = useState('')
  const [qbCategory, setQbCategory] = useState('')
  const [qbDifficulty, setQbDifficulty] = useState('')
  const [editingBankId, setEditingBankId] = useState<string | null>(null)

  const [hostMode, setHostMode] = useState<HostMode>('preshow')
  const [hostModeTouched, setHostModeTouched] = useState(false)
  const selectHostMode = (mode: HostMode) => {
    setHostModeTouched(true)
    setHostMode(mode)
  }
  const importFileRef = useRef<HTMLInputElement>(null)
  const importReplaceRef = useRef(false)
  const [tvPairCode, setTvPairCode] = useState('')
  const [attachedDisplays, setAttachedDisplays] = useState<HostDisplayRoster['displays']>([])
  const [livelyGameplayTableNums, setLivelyGameplayTableNums] = useState<number[]>([])
  const [answerWindowSeconds, setAnswerWindowSeconds] = useState(45)
  const [venueSmallBlind, setVenueSmallBlind] = useState(10)
  const [venueBigBlind, setVenueBigBlind] = useState(20)
  const [handsPerBlindLevel, setHandsPerBlindLevel] = useState(3)
  const [blindLevelSummary, setBlindLevelSummary] = useState<string | null>(null)
  const [venueFeltBeat, setVenueFeltBeat] = useState<HostVenueFeltBeatRow[] | null>(null)
  const [venueFloorBrief, setVenueFloorBrief] = useState<HostVenueFloorBriefPayload | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>(() =>
    getSocketConnectionStatus(),
  )

  const viteHostSecret =
    typeof import.meta.env.VITE_HOST_SECRET === 'string' ? import.meta.env.VITE_HOST_SECRET.trim() : ''
  /** Matches apps/server LOCAL_DEV_HOST_SECRET. Production builds send only VITE_HOST_SECRET. */
  const effectiveHostSecret = viteHostSecret || (import.meta.env.DEV ? 'quizzem-local-host' : undefined)

  useEffect(() => onSocketConnectionStatus(setConnectionStatus), [])

  useEffect(() => {
    const cleanup = connect('host', 'HOST', hostVenueCode, socketTableId, {
      hostSecret: effectiveHostSecret,
    })
    const stopKeepalive = startConnectionKeepalive({ syncMs: 30_000 })
    return () => {
      stopKeepalive()
      cleanup()
    }
  }, [hostVenueCode, socketTableId, effectiveHostSecret])

  // Assign / refresh moves this socket on the server. Update the desk label only.
  useEffect(() => {
    const off = onHostBoundTable(({ tableId }) => {
      const next = String(tableId ?? '').trim()
      if (!next) return
      setHostTableId((prev) => (prev === next ? prev : next))
    })
    return off
  }, [])

  useEffect(() => {
    const unsubscribe = onState((newGameState) => {
      console.log('🎰 Host: State update received - Phase:', newGameState?.phase)
      console.log('🎰 Host: State update received - Question:', newGameState?.round?.question?.text)
      console.log('🎰 Host: State update received - Question ID:', newGameState?.round?.question?.id)
      setGameState(newGameState)
    })
    return unsubscribe
  }, [])

  // Debug current game state
  useEffect(() => {
    console.log('🎰 Host: Current game state - Phase:', gameState?.phase)
    console.log('🎰 Host: Current game state - Has Question:', !!gameState?.round?.question)
    console.log('🎰 Host: Current game state - Players Count:', gameState?.players?.length)
    console.log('🎰 Host: Current game state - Question Text:', gameState?.round?.question?.text)
  }, [gameState])

  useEffect(() => {
    const unsubscribe = onToast((message) => {
      const venueAlert = hostVenueAutoAlertFromToast(message)
      if (venueAlert) {
        setToastVenueAlert(venueAlert)
        window.setTimeout(() => setToastVenueAlert(null), HOST_VENUE_ALERT_MS)
        return
      }
      setToastMessage(message)
      setTimeout(() => setToastMessage(null), 3000)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const off = onHostLibrary((snap) => {
      setQuestionBank(snap.questions)
      setSetlists(snap.setlists)
      setActiveSetlistId(snap.activeSetlistId)
      setActiveSetlistNextIndex(snap.activeSetlistNextIndex)
      if (typeof snap.answerWindowSeconds === 'number' && Number.isFinite(snap.answerWindowSeconds)) {
        setAnswerWindowSeconds(clampVenueAnswerWindow(snap.answerWindowSeconds))
      }
      if (snap.venueBlinds) {
        setVenueSmallBlind(Math.max(1, Math.floor(snap.venueBlinds.smallBlind)))
        setVenueBigBlind(Math.max(1, Math.floor(snap.venueBlinds.bigBlind)))
        setHandsPerBlindLevel(Math.max(1, Math.floor(snap.venueBlinds.handsPerBlindLevel)))
        setBlindLevelSummary(formatVenueBlindsSummary(snap.venueBlinds))
      }
    })
    return off
  }, [])

  useEffect(() => {
    const off = onHostVenueGameplayHints((p) => {
      setLivelyGameplayTableNums(p.livelyTableNums)
    })
    return off
  }, [])

  useEffect(() => {
    const off = onHostVenueFeltBeat((p) => {
      setVenueFeltBeat(p.felts)
    })
    return off
  }, [])

  useEffect(() => {
    const off = onHostVenueFloorBrief((p) => {
      setVenueFloorBrief(p)
    })
    return off
  }, [])

  useEffect(() => {
    return onHostDisplays((payload) => {
      setAttachedDisplays(payload.displays ?? [])
    })
  }, [])

  useEffect(() => {
    if (!gameState || hostModeTouched) return
    setHostMode(suggestHostMode(gameState, venueFeltBeat))
  }, [gameState, venueFeltBeat, hostModeTouched])

  const handleStartGame = () => {
    if (socket) {
      socket.emit('action', { type: 'startGame' })
    }
  }

  const handleSetRandomQuestion = () => {
    pushQuestionToVenue()
  }

  const handlePushBankQuestion = (questionId: string) => {
    pushQuestionToVenue({ questionId })
  }

  function resetQuestionDraft() {
    setQbText('')
    setQbAnswer('')
    setQbCategory('')
    setQbDifficulty('')
    setEditingBankId(null)
  }

  function handleSaveBankQuestion(e: FormEvent) {
    e.preventDefault()
    const ans = Number(qbAnswer)
    if (!qbText.trim() || Number.isNaN(ans)) return
    const dt = qbDifficulty.trim()
    const normalizedDiff =
      dt === ''
        ? null
        : (() => {
            const d = Number(dt)
            return !Number.isNaN(d) && d >= 1 && d <= 5 ? d : null
          })()

    if (editingBankId) {
      questionBankUpdate({
        id: editingBankId,
        text: qbText.trim(),
        answer: ans,
        category: qbCategory.trim() === '' ? null : qbCategory.trim(),
        difficulty: dt === '' ? null : normalizedDiff,
      })
    } else {
      questionBankAdd({
        text: qbText.trim(),
        answer: ans,
        category: qbCategory.trim() || undefined,
        ...(normalizedDiff != null ? { difficulty: normalizedDiff } : {}),
      })
    }
    resetQuestionDraft()
  }

  function startEditBankQuestion(q: Question) {
    setEditingBankId(q.id)
    setQbText(q.text)
    setQbAnswer(String(q.answer))
    setQbCategory(q.category ?? '')
    setQbDifficulty(q.difficulty != null ? String(q.difficulty) : '')
  }

  function appendQuestionToSetlist(setlistId: string, questionId: string) {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl || sl.questionIds.includes(questionId)) return
    setlistSave({ id: setlistId, questionIds: [...sl.questionIds, questionId] })
  }

  function moveSetlistQuestion(setlistId: string, index: number, dir: 'up' | 'down') {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl) return
    const ids = [...sl.questionIds]
    const j = dir === 'up' ? index - 1 : index + 1
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    setlistSave({ id: setlistId, questionIds: ids })
  }

  function removeSetlistQuestion(setlistId: string, index: number) {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl) return
    setlistSave({
      id: setlistId,
      questionIds: sl.questionIds.filter((_, i) => i !== index),
    })
  }

  function shuffleSetlistQuestions(setlistId: string) {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl || sl.questionIds.length < 2) return
    const ids = [...sl.questionIds]
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    }
    setlistSave({ id: setlistId, questionIds: ids })
  }

  const handleDealCommunityCards = () => {
    if (socket) {
      socket.emit('action', { type: 'dealCommunityCards' })
    }
  }

  const handleRevealAnswer = () => {
    if (socket) {
      socket.emit('action', { type: 'revealAnswer' })
    }
  }

  const handleStartAnswering = () => {
    const sec = clampVenueAnswerWindow(answerWindowSeconds)
    setAnswerWindowSeconds(sec)
    startAnswering({ answerWindowSeconds: sec })
  }

  const handleEndRound = () => {
    if (socket) {
      socket.emit('action', { type: 'endRound' })
    }
  }

  const handleNewGame = () => {
    if (socket) {
      socket.emit('action', { type: 'newGame' })
    }
    setHostModeTouched(false)
    setHostMode('preshow')
  }

  const handleSeatPlayers = (plan?: {
    tableCount: number
    assignments: { playerId: string; tableNum: number }[]
  }) => {
    setHostModeTouched(true)
    setHostMode('live')
    assignTablesFromLobby(plan, (ack) => {
      if (ack.ok) return
      setHostMode('preshow')
    })
  }

  const feltAutoAlert = useHostVenueAutoAlerts(venueFeltBeat)
  const venueAutoAlert = toastVenueAlert ?? feltAutoAlert

  if (!gameState) {
    return (
      <div className="host-root host-connect flex min-h-screen items-center justify-center">
        <div className="host-instrument rounded-2xl px-10 py-8 text-center">
          <motion.h1 
            className="mb-2 flex items-center justify-center gap-3 text-5xl font-black tracking-tight text-white"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="host-mark" aria-hidden />
            {'Quizz\u2019em'}
          </motion.h1>
          <p className="mb-6 text-sm font-bold uppercase tracking-[0.28em] text-casino-gold">Host</p>
          <motion.div 
            className="host-phase-pill inline-flex items-center text-xl text-white/80"
            data-live="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Connecting to server...
          </motion.div>
        </div>
      </div>
    )
  }

  const rehearsalCpuOnly =
    gameState.players.length > 0 && gameState.players.every((p) => p.id.startsWith('vp:'))
  const inVenueRehearsalLobby =
    (gameState.tableId ?? '') === LOBBY_TABLE_ID && gameState.phase === 'lobby'
  const showVenueRehearsalPreview = inVenueRehearsalLobby || rehearsalCpuOnly
  const atPlayerCap = gameState.players.length >= gameState.maxPlayers
  const hasVenueFeltBeat =
    venueFeltBeat != null && venueFeltBeat.some((r) => r.active && r.seated > 0)

  const hostControlState = hostDeskStateWithLiveQuestion(gameState, venueFeltBeat)
  const headerPhase = hostHeaderPhaseDisplay(gameState, hostControlState)
  const controlRound = hostControlState.round
  const controlBettingRound = controlRound.bettingRound ?? 0
  const controlCommunityLen = controlRound.communityCards?.length ?? 0

  const dealCommunityGate = hostDealCommunityGate({
    hasVenueBeat: hasVenueFeltBeat,
    venueBeat: venueFeltBeat,
    controlState: hostControlState,
  })
  const closeBettingGate = hostCloseBettingGate({
    hasVenueBeat: hasVenueFeltBeat,
    venueBeat: venueFeltBeat,
    controlState: hostControlState,
  })
  const startAnswerGate = hostStartAnswerGate({
    hasVenueBeat: hasVenueFeltBeat,
    venueBeat: venueFeltBeat,
    controlState: hostControlState,
  })

  const dealCommunityBlocked = dealCommunityGate.blocked
  const dealCommunityHint = dealCommunityGate.hint
  const closeBetBlocked = closeBettingGate.blocked
  const closeBetHint = closeBettingGate.hint
  const startAnswerBlocked = startAnswerGate.blocked
  const startAnswerHint = startAnswerGate.hint

  const activeSetlist = activeSetlistId != null ? setlists.find((s) => s.id === activeSetlistId) : undefined
  const hasActiveSetlist =
    activeSetlist != null &&
    activeSetlist.questionIds.length > 0 &&
    activeSetlistNextIndex < activeSetlist.questionIds.length

  const phaseDockItems = buildHostPhaseDockItems({
    gameState: hostControlState,
    answerWindowSeconds,
    dealCommunityBlocked,
    closeBetBlocked,
    startAnswerBlocked,
    communityLen: controlCommunityLen,
    bettingRound: controlBettingRound,
    onStartGame: handleStartGame,
    onAssignFromLobby: handleSeatPlayers,
    onDealCommunity: handleDealCommunityCards,
    onStartAnswering: handleStartAnswering,
    onRevealAnswer: handleRevealAnswer,
    onEndRound: handleEndRound,
    onRandomQuestion: handleSetRandomQuestion,
    onNextSetlist: () => nextQuestionFromSetlist(),
    onNudgeActing: () => nudgeActingPlayers(),
    onForceAdvance: () => adminAdvanceTurn(),
    onRehearsalSkipToShowdown: rehearsalCpuOnly ? () => rehearsalSkipToShowdown() : undefined,
    hasActiveSetlist,
  })

  const nextQuestionText =
    hasActiveSetlist && activeSetlist
      ? questionBank.find((q) => q.id === activeSetlist.questionIds[activeSetlistNextIndex])?.text
      : undefined
  const afterPayout = (venueFloorBrief?.handsCompleted ?? 0) > 0
  const pacingSuggestion = suggestNextHostAction(hostControlState, venueFeltBeat, {
    hasActiveSetlist,
    nextQuestionText,
    afterPayout,
  })
  const runOfShowHeadline = {
    title: pacingSuggestion.title,
    detail: pacingSuggestion.detail,
  }
  const currentRunStepId = resolveRunOfShowStepForHost(hostControlState, venueFeltBeat)
  const floorLockstepMisaligned = hostFloorLockstepMisaligned(venueFeltBeat)
  const primaryDockId = phaseDockItems.find((i) => i.role === 'primary')?.id ?? phaseDockItems[0]?.id
  const runBarCueHint =
    primaryDockId === 'close-bet' && closeBetBlocked
      ? closeBetHint
      : primaryDockId === 'deal-board' && dealCommunityBlocked
        ? dealCommunityHint
        : primaryDockId === 'start-answer' && startAnswerBlocked
          ? startAnswerHint
          : null
  const hostTableNum = (() => {
    const raw = gameState.tableId ?? '1'
    if (raw === LOBBY_TABLE_ID) return 1
    const n = Number.parseInt(String(raw), 10)
    return Number.isFinite(n) && n >= 1 ? n : 1
  })()
  const questionTotal = activeSetlist?.questionIds.length || 25
  const handsLeft = Math.max(0, questionTotal - (venueFloorBrief?.handsCompleted ?? 0))
  const soloPublicTable = publicDisplaySoloTable(venueFloorBrief)
  const applyBlindCall = (call: BlindCall) => {
    if (call.handsPerLevel !== handsPerBlindLevel) {
      setHandsPerBlindLevel(call.handsPerLevel)
      setVenueBlindStructure(call.handsPerLevel)
    }
    setVenueSmallBlind(call.smallBlind)
    setVenueBigBlind(call.bigBlind)
    setVenueBlinds(call.smallBlind, call.bigBlind)
    if (call.guideSec !== answerWindowSeconds) {
      const sec = clampVenueAnswerWindow(call.guideSec)
      setAnswerWindowSeconds(sec)
      setVenueAnswerWindowSeconds(sec)
    }
  }
  const saveVenueBlinds = () => {
    setVenueBlinds(Math.max(1, venueSmallBlind), Math.max(venueSmallBlind, venueBigBlind))
  }
  const saveBlindStructure = () => {
    setVenueBlindStructure(Math.max(1, Math.min(50, handsPerBlindLevel)))
  }
  const saveTableBlindsOverride = () => {
    setTableBlinds(hostTableNum, Math.max(1, venueSmallBlind), Math.max(venueSmallBlind, venueBigBlind))
  }
  const clearTableBlindsOverride = () => {
    clearTableBlinds(hostTableNum)
  }
  const hostBlindsControlProps = {
    venueSmallBlind,
    venueBigBlind,
    handsPerBlindLevel,
    blindLevelSummary,
    tableNum: hostTableNum,
    hostTableId: gameState.tableId ?? '1',
    onVenueSmallBlindChange: setVenueSmallBlind,
    onVenueBigBlindChange: setVenueBigBlind,
    onHandsPerLevelChange: setHandsPerBlindLevel,
    onSaveVenueBlinds: saveVenueBlinds,
    onSaveBlindStructure: saveBlindStructure,
    onSaveTableBlinds: saveTableBlindsOverride,
    onClearTableBlinds: clearTableBlindsOverride,
  }

  const showVenueFloorOnTvs = () =>
    displaySetLayout({ layout: 'venueWall', focusTable: null, wallView: 'floor' })
  const showLeaderboardOnTvs = () =>
    displaySetLayout({ layout: 'venueWall', focusTable: null, wallView: 'leaderboard' })
  const showTriviaLeaderboardOnTvs = () =>
    displaySetLayout({ layout: 'venueWall', focusTable: null, wallView: 'leaderboard-trivia' })
  const showSeatingRulesOnTvs = () =>
    displaySetLayout({ layout: 'venueWall', focusTable: null, wallView: 'rules' })
  const showSeatingChartOnTvs = () =>
    displaySetLayout({ layout: 'venueWall', focusTable: null, wallView: 'seating-chart' })
  const showEliminationsOnTvs = () =>
    displaySetLayout({ layout: 'venueWall', focusTable: null, wallView: 'busts' })
  const spotlightTableOnTvs = (n: number) =>
    displaySetLayout({ layout: 'venueWall', focusTable: n, wallView: 'floor' })

  const moreMenu = (
    <HostMoreMenu>
              <>
                <HostRoomControls
                  brief={venueFloorBrief}
                  hostPlayerLabel={hostPlayerLabel}
                  onMove={(playerId, toTableNum) => movePlayerToTable(playerId, toTableNum)}
                  onRemove={(playerId) => removePlayerFromEvent(playerId)}
                  onShuffleEvery={(every) => setVenueShuffleEvery(every)}
                  onSkipNextShuffle={(skip) => setVenueSkipNextShuffle(skip)}
                  onShuffleNow={() => shuffleTablesNow()}
                />
                <HostVenueMoveLogPanel
                  brief={venueFloorBrief}
                  hostPlayerLabel={hostPlayerLabel}
                  forceOpen={floorLockstepMisaligned}
                />

                {(gameState.phase === 'showdown' || gameState.phase === 'reveal') &&
                gameState.round.question ? (
                  <HostCollapsible summary="Showdown distance table" className="mb-0" defaultOpen={false}>
                    {(() => {
                      const correct = gameState.round.question?.answer
                      const rows = gameState.players
                        .map((p, seatIdx) => {
                          const hasAnswer = typeof p.submittedAnswer === 'number'
                          const distance =
                            hasAnswer && typeof correct === 'number'
                              ? Math.abs((p.submittedAnswer as number) - correct)
                              : Infinity
                          const contest = hostContestStatus(p)
                          return { player: p, seat: seatIdx + 1, hasAnswer, distance, contest }
                        })
                        .sort((a, b) => a.distance - b.distance)
                      const winnerId =
                        rows.length && rows[0].distance !== Infinity ? rows[0].player.id : undefined
                      return (
                        <div className="overflow-x-auto rounded-lg border border-white/10">
                          <table className="min-w-full text-left text-sm text-white/90">
                            <thead>
                              <tr className="text-white/70">
                                <th className="py-2 px-3">Seat</th>
                                <th className="py-2 px-3">Player</th>
                                <th className="py-2 px-3">Contest</th>
                                <th className="py-2 px-3">Submitted</th>
                                <th className="py-2 px-3">Distance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(({ player, seat, hasAnswer, distance, contest }) => (
                                <tr
                                  key={player.id}
                                  className={`${player.id === winnerId ? 'bg-white/10' : ''} ${
                                    contest.kind === 'points' ? 'opacity-90' : ''
                                  }`}
                                >
                                  <td className="py-2 px-3 tabular-nums text-white/80">{seat}</td>
                                  <td className="py-2 px-3 font-bold text-casino-emerald">
                                    {hostPlayerLabel(player.name)}
                                  </td>
                                  <td className="py-2 px-3">
                                    <HostContestBadge
                                      kind={contest.kind}
                                      label={contest.label}
                                      reason={hostContestReasonLabel(contest)}
                                      title={contest.detail}
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    {hasAnswer ? formatTriviaNumber(player.submittedAnswer) : '—'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {hasAnswer && typeof correct === 'number'
                                      ? formatTriviaNumber(distance)
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </HostCollapsible>
                ) : null}

                <HostCollapsible summary="Practice bots & rehearsal" className="mb-0">
                  <section className="space-y-3">
                    {showVenueRehearsalPreview ? (
                      <div className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                            Table count
                            <input
                              type="number"
                              min={1}
                              max={VENUE_NUMBERED_TABLE_MAX}
                              value={rehearsalTableCount}
                              onChange={(e) => {
                                const parsed = Number.parseInt(e.target.value, 10)
                                if (!Number.isFinite(parsed)) return
                                setRehearsalTableCount(
                                  Math.max(1, Math.min(VENUE_NUMBERED_TABLE_MAX, parsed)),
                                )
                              }}
                              className="w-[4.5rem] rounded-md border border-amber-500/40 bg-black/50 px-2 py-2 text-center text-base font-bold tabular-nums text-amber-50"
                            />
                          </label>
                          {inVenueRehearsalLobby ? (
                            <NeonButton
                              variant="gold"
                              size="small"
                              onClick={() => seedRehearsalVenue(rehearsalTableCount)}
                            >
                              Seed rehearsal
                            </NeonButton>
                          ) : null}
                          <NeonButton
                            variant="purple"
                            size="small"
                            onClick={() => rehearsalPreviewWinnerScreen(rehearsalTableCount)}
                          >
                            Preview winner screen
                          </NeonButton>
                        </div>
                      </div>
                    ) : null}
                    {rehearsalCpuOnly && gameState.phase !== 'showdown' && gameState.phase !== 'reveal' ? (
                      <NeonButton variant="gold" size="small" onClick={() => rehearsalSkipToShowdown()}>
                        Skip to winner screen
                      </NeonButton>
                    ) : null}
                    <div className="flex flex-wrap gap-2 items-center">
                      <div
                        className="flex flex-wrap gap-1.5 rounded-lg border border-white/20 bg-black/40 p-1"
                        role="group"
                        aria-label="Number of virtual CPUs to add"
                      >
                        {[1, 2, 5, 10, 15, 20].map((n) => (
                          <button
                            key={n}
                            type="button"
                            disabled={atPlayerCap}
                            onClick={() => setVirtualAddCount(n)}
                            className={`min-w-[2.75rem] rounded-md px-2.5 py-2.5 text-center text-base font-bold tabular-nums transition-colors disabled:opacity-40 ${
                              virtualAddCount === n
                                ? 'border border-amber-400/60 bg-amber-500/25 text-amber-100'
                                : 'border border-transparent text-white/75 hover:bg-white/10'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <NeonButton
                        variant="gold"
                        size="small"
                        disabled={atPlayerCap}
                        onClick={() => addVirtualPlayers(virtualAddCount)}
                      >
                        Add CPU seats
                      </NeonButton>
                      <NeonButton variant="purple" size="small" onClick={() => clearVirtualPlayers()}>
                        Clear all CPUs
                      </NeonButton>
                    </div>
                  </section>
                </HostCollapsible>

                <HostCollapsible summary="Overrides & hard reset" className="mb-0">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <NeonButton
                        variant="gold"
                        size="normal"
                        onClick={() => nudgeActingPlayers()}
                        disabled={gameState.phase !== 'betting' || !gameState.round.isBettingOpen}
                        className="w-full"
                      >
                        Nudge acting (30s)
                      </NeonButton>
                      <NeonButton
                        variant="gold"
                        size="normal"
                        onClick={() => adminAdvanceTurn()}
                        disabled={gameState.phase !== 'betting' || !gameState.round.isBettingOpen}
                        className="w-full"
                      >
                        Fold acting player
                      </NeonButton>
                      <NeonButton
                        variant="red"
                        size="normal"
                        onClick={() => adminCloseBetting()}
                        disabled={gameState.phase !== 'betting' || !gameState.round.isBettingOpen}
                        className="w-full md:col-span-2"
                      >
                        Close betting
                      </NeonButton>
                    </div>
                    <HostBlindsControls {...hostBlindsControlProps} />
                    <label className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                      <span>Host view table (diagnostics)</span>
                      <select
                        value={hostTableId}
                        onChange={(e) => {
                          const next = e.target.value
                          setHostTableId(next)
                          setSocketTableId(next)
                        }}
                        className="max-w-[14rem] rounded-lg border border-white/20 bg-zinc-950 py-1.5 pl-2 pr-8 text-sm text-white [color-scheme:dark]"
                      >
                        {[
                          LOBBY_TABLE_ID,
                          ...Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, i) => String(i + 1)),
                        ].map((v) => (
                          <option key={v} value={v} className="bg-zinc-950 text-white">
                            {v === LOBBY_TABLE_ID ? 'Lobby pool' : `Table ${v}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <NeonButton variant="gold" size="normal" onClick={handleNewGame} className="w-full">
                      New game (hard reset — clears all tables)
                    </NeonButton>
                  </div>
                </HostCollapsible>

              </>
    </HostMoreMenu>
  )

  return (
    <div
      className="host-root relative flex flex-col overflow-hidden bg-casino-gradient"
      style={hostDeskFrameStyle()}
    >
      {/* Backdrop — static gradient so the desk stays readable during long hosts */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,180,120,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(100,70,160,0.06),transparent_50%)]" />
      </div>

      {connectionStatus !== 'connected' ? (
        <div
          className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-lg border border-amber-400/50 bg-amber-950/90 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg"
          role="status"
        >
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting to server… desk will resync automatically.'
            : 'Host disconnected — retrying…'}
        </div>
      ) : null}

      {/* Toast Messages */}
      <AnimatePresence>
        {venueAutoAlert ? (
          <HostVenueAutoAlertBanner key={venueAutoAlert.kind + venueAutoAlert.title} alert={venueAutoAlert} />
        ) : null}
        {toastMessage && (
          <motion.div
            className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-white/20 bg-glass-gradient p-5 text-lg text-white shadow-lg backdrop-blur-md"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <ChipText text={toastMessage} />
          </motion.div>
        )}
      </AnimatePresence>

      <HostDeskShell
        header={
        <motion.header
          className="host-masthead mb-2 shrink-0 rounded-xl border border-white/10 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-md sm:px-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span className="host-mark" aria-hidden />
                <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {'Quizz\u2019em'} <span className="font-normal text-white/40">·</span>{' '}
                  <span className="font-semibold text-casino-gold">Host</span>
                </span>
              </div>
              <span className="hidden h-8 w-px bg-white/15 lg:block" aria-hidden />
              <div className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-white/45">Room</span>
                <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono font-semibold text-white/90 tabular-nums">
                  {gameState.code}
                </span>
                <button
                  type="button"
                  aria-label="Open public display"
                  onClick={() => openVenueWindow('display', gameState.code)}
                  className="rounded-md border border-sky-400/40 bg-sky-950/40 px-3 py-1 text-sm font-bold text-sky-100 hover:bg-sky-900/50"
                >
                  Display
                </button>
                <button
                  type="button"
                  aria-label="Open player"
                  onClick={() => openVenueWindow('player', gameState.code)}
                  className="rounded-md border border-emerald-400/40 bg-emerald-950/40 px-3 py-1 text-sm font-bold text-emerald-100 hover:bg-emerald-900/50"
                >
                  Player
                </button>
                {soloPublicTable != null &&
                String(soloPublicTable) === (gameState.tableId ?? '').trim() ? (
                  <>
                    <span className="text-white/45">Your focus</span>
                    <span className="rounded-full border border-amber-500/35 bg-amber-950/30 px-2.5 py-0.5 font-medium text-casino-gold">
                      Table {gameState.tableId}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="text-base uppercase tracking-wider text-white/35">Status</span>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className="host-phase-pill inline-flex items-center rounded-md border border-casino-emerald/40 bg-casino-emerald/15 px-3.5 py-1.5 text-lg font-bold text-casino-emerald"
                  data-live={venueFloorBrief?.venueHeld ? 'false' : 'true'}
                >
                  {venueFloorBrief?.venueHeld
                    ? 'On hold'
                    : headerPhase.phase === 'lobby'
                    ? 'Waiting room'
                    : headerPhase.phase === 'betting'
                      ? 'Betting'
                      : headerPhase.phase === 'answering'
                        ? 'Guessing'
                        : headerPhase.phase === 'showdown'
                          ? 'Results'
                          : headerPhase.phase === 'question'
                            ? 'Question'
                            : headerPhase.phase === 'reveal'
                              ? 'Answer reveal'
                              : headerPhase.phase}
                </span>
                {headerPhase.floorMirrored ? (
                  <span className="text-xs font-semibold tracking-wide text-white/40">
                    Watching the floor from the waiting room
                  </span>
                ) : null}
              </div>
              {(venueFloorBrief?.roster.length ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => setVenueHold(!(venueFloorBrief?.venueHeld === true))}
                  className={`rounded-md px-3.5 py-1.5 text-base font-bold ${
                    venueFloorBrief?.venueHeld
                      ? 'border border-amber-300/70 bg-amber-400 text-black'
                      : 'border border-amber-400/40 bg-amber-950/40 text-amber-100'
                  }`}
                >
                  {venueFloorBrief?.venueHeld ? 'Resume' : 'Hold'}
                </button>
              ) : null}
            </div>
          </div>

          <HostModeNav
            mode={hostMode}
            onSelect={selectHostMode}
            liveCount={livelyGameplayTableNums.length}
            more={moreMenu}
          />
        </motion.header>
        }
      >

        {hostMode === 'preshow' ? (
          <HostPreShowPanel
            gameState={gameState}
            hostPlayerLabel={hostPlayerLabel}
            tvPairCode={tvPairCode}
            setTvPairCode={setTvPairCode}
            onSeatPlayers={handleSeatPlayers}
            onRemovePlayer={(playerId) => removePlayerFromEvent(playerId)}
            onGoQuestions={() => selectHostMode('questions')}
            onPairTv={(code) => {
              pairDisplayWithHost(code, (ack) => {
                if (ack.ok) setTvPairCode('')
              })
            }}
            attachedDisplays={attachedDisplays}
            onReleaseDisplay={releaseDisplay}
            floorSeated={hasVenueFeltBeat}
          />
        ) : null}

        {hostMode === 'questions' ? (
          <HostQuestionsPanel
            gameState={gameState}
            questionBank={questionBank}
            setlists={setlists}
            activeSetlistId={activeSetlistId}
            activeSetlistNextIndex={activeSetlistNextIndex}
            onActivateSetlist={(id) => selectTriviaSetlist(id)}
            setlistDraftId={setlistDraftId}
            setSetlistDraftId={setSetlistDraftId}
            qbText={qbText}
            setQbText={setQbText}
            qbAnswer={qbAnswer}
            setQbAnswer={setQbAnswer}
            qbCategory={qbCategory}
            setQbCategory={setQbCategory}
            qbDifficulty={qbDifficulty}
            setQbDifficulty={setQbDifficulty}
            editingBankId={editingBankId}
            importFileRef={importFileRef}
            importReplaceRef={importReplaceRef}
            onImportError={(msg) => {
              setToastMessage(msg)
              setTimeout(() => setToastMessage(null), 4500)
            }}
            handleSaveBankQuestion={handleSaveBankQuestion}
            resetQuestionDraft={resetQuestionDraft}
            startEditBankQuestion={startEditBankQuestion}
            appendQuestionToSetlist={appendQuestionToSetlist}
            moveSetlistQuestion={moveSetlistQuestion}
            removeSetlistQuestion={removeSetlistQuestion}
            shuffleSetlistQuestions={shuffleSetlistQuestions}
            handlePushBankQuestion={handlePushBankQuestion}
          />
        ) : null}

        {hostMode === 'live' ? (
          <HostLivePanel
            gameState={gameState}
            phaseDockItems={phaseDockItems}
            runOfShowHeadline={runOfShowHeadline}
            pacingUrgency={pacingSuggestion.urgency}
            runBarCueHint={runBarCueHint}
            onVenueFloor={showVenueFloorOnTvs}
            onLeaderboard={showLeaderboardOnTvs}
            onTriviaLeaderboard={showTriviaLeaderboardOnTvs}
            onSeatingChart={showSeatingChartOnTvs}
            onEliminations={
              (venueFloorBrief?.lastHandBustCount ?? 0) > 0 ? showEliminationsOnTvs : undefined
            }
            onSeatingRules={showSeatingRulesOnTvs}
            activeView={venueFloorBrief?.wallView ?? 'floor'}
            venueFeltBeat={venueFeltBeat}
            questionSlot={
              hostControlState.round.question ? (
                <HostLiveQuestionCard
                  text={hostControlState.round.question.text}
                  answer={hostControlState.round.question.answer}
                />
              ) : null
            }
            handBody={
              currentRunStepId === 'start-answer' ? (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-purple-400/30 bg-purple-950/25 px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor="answer-window-sec"
                      className="text-xs font-semibold uppercase tracking-wide text-white/48"
                    >
                      Guide countdown (sec)
                    </label>
                    <input
                      id="answer-window-sec"
                      type="number"
                      min={15}
                      max={300}
                      step={5}
                      value={answerWindowSeconds}
                      onChange={(e) =>
                        setAnswerWindowSeconds(clampVenueAnswerWindow(Number(e.target.value)))
                      }
                      className="w-[4.5rem] rounded-md border border-white/25 bg-black/50 px-2 py-1.5 text-center text-base font-bold tabular-nums text-white"
                    />
                  </div>
                  <NeonButton
                    variant="blue"
                    size="small"
                    type="button"
                    onClick={() =>
                      setVenueAnswerWindowSeconds(clampVenueAnswerWindow(answerWindowSeconds))
                    }
                  >
                    Save default
                  </NeonButton>
                </div>
              ) : null
            }
            floorNow={
              <HostVenueFloorBriefPanel
                brief={venueFloorBrief}
                feltRows={venueFeltBeat}
                hostPlayerLabel={hostPlayerLabel}
                hostTableId={hostTableId}
                onAlignRoom={() => alignTablesToRoom()}
                onSetTablePhase={(tableNum, signature) => setTablePhase(tableNum, signature)}
                onSpotlight={spotlightTableOnTvs}
                blindCall={
              <HostBlindCall
                showStartedAtMs={venueFloorBrief?.showStartedAtMs ?? null}
                handsLeft={handsLeft}
                players={venueFloorBrief?.fieldPlayerCount ?? 0}
                startedWith={venueFloorBrief?.fieldPeakCount ?? venueFloorBrief?.fieldPlayerCount ?? 0}
                medianStack={venueFloorBrief?.medianStack ?? null}
                bigBlind={venueBigBlind}
                handsPerLevel={handsPerBlindLevel}
                guideSec={answerWindowSeconds}
                onApply={applyBlindCall}
              />
                }
              />
            }
            onGoPreShow={() => selectHostMode('preshow')}
            attachedDisplays={attachedDisplays}
            onReleaseDisplay={releaseDisplay}
          />
        ) : null}

      </HostDeskShell>
    </div>
  )
}

export default HostApp

