import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  connect,
  disconnect,
  onState,
  onToast,
  onSeated,
  onPlayerVenueBrief,
  fold,
  submitAnswer,
  check as checkAction,
  callBet as callAction,
  raiseBet as raiseAction,
  allIn as allInAction,
  useSocket,
  setActivePlayerId,
} from '@qhe/net'
import type { PlayerGameStateWire, PlayerVenueBrief } from '@qhe/net'
import { LOBBY_TABLE_ID, inChipContest } from '@qhe/core'
import { recordServerClockSample } from './serverClock'
import {
  readPlayerJoinPrefs,
  persistPlayerJoinPrefs,
  playerDisplayNameFromPrefs,
  type PlayerJoinBootstrap,
} from './playerUrlParams'
import { useAnswerCountdown } from './hooks/useAnswerCountdown'
import { useHandSummary } from './hooks/useHandSummary'
import { useTableResults } from './hooks/useTableResults'
import {
  EMPTY_COMPOSED_ANSWER,
  backspaceFromAnswer,
  selectionToComposition,
  toggleCardInSelection,
  toggleDecimal,
  validateAnswerSubmit,
  type ComposedAnswer,
  type SelectedCardRef,
} from './playerModel/answerComposition'
import { buildBettingContext, resolveMyPlayerIndex } from './playerModel/bettingModel'
import { resolvePreAction, type PreAction } from './playerModel/preAction'
import JoinScreen from './components/JoinScreen'
import ConnectingScreen from './components/ConnectingScreen'
import LobbyWaitingScreen from './components/LobbyWaitingScreen'
import EliminatedScreen from './components/EliminatedScreen'
import PlayerToast from './components/PlayerToast'
import { PlayerTableHeader, PlayerGameStatusBar } from './components/PlayerTableHeader'
import VenueStatusStrip from './components/VenueStatusStrip'
import PhaseBanner from './components/PhaseBanner'
import GameInfoCard from './components/GameInfoCard'
import PostHandSummaryCard from './components/PostHandSummaryCard'
import TableResultsPanel from './components/TableResultsPanel'
import AnswerComposerModal from './components/AnswerComposerModal'
import BettingActions from './components/BettingActions'
import BettingMobileDock from './components/BettingMobileDock'
import TableFeltView from './components/TableFeltView'
import StickyQuestionBar from './components/StickyQuestionBar'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule } from './components/PlayerGoldChrome'

type JoinPhase = 'form' | 'connecting' | 'in_venue'

function PlayerApp() {
  const [joinPrefs, setJoinPrefs] = useState<PlayerJoinBootstrap>(() => readPlayerJoinPrefs())
  const [joinPhase, setJoinPhase] = useState<JoinPhase>('form')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinNonce, setJoinNonce] = useState(0)
  const [gameState, setGameState] = useState<PlayerGameStateWire | null>(null)
  const [venueBrief, setVenueBrief] = useState<PlayerVenueBrief | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [disconnected, setDisconnected] = useState(false)
  const [lastTableId, setLastTableId] = useState<string | null>(null)
  const [raiseAmount, setRaiseAmount] = useState(0)
  const [preAction, setPreAction] = useState<PreAction | null>(null)
  const [composedAnswer, setComposedAnswer] = useState<ComposedAnswer>(EMPTY_COMPOSED_ANSWER)
  const [selectedCards, setSelectedCards] = useState<SelectedCardRef[]>([])
  const [submittedAnswerDisplay, setSubmittedAnswerDisplay] = useState<string | null>(null)
  const socket = useSocket()

  useEffect(() => {
    setActivePlayerId(joinPrefs.playerId)
  }, [joinPrefs.playerId])

  const playerName = playerDisplayNameFromPrefs(joinPrefs)
  const joinTableId = LOBBY_TABLE_ID

  const showToast = useCallback((message: string, ms = 3500) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), ms)
  }, [])

  const handleJoinPrefsChange = useCallback((next: PlayerJoinBootstrap) => {
    setJoinPrefs(next)
    setJoinError(null)
  }, [])

  const handleJoin = () => {
    if (!playerName || !joinPrefs.roomCode.trim()) return
    if (!joinPrefs.firstName.trim() || !joinPrefs.lastInitial.trim()) return
    persistPlayerJoinPrefs({ ...joinPrefs, autoSeat: true, tableId: LOBBY_TABLE_ID })
    setJoinError(null)
    setJoinPhase('connecting')
    setJoinNonce((n) => n + 1)
  }

  useEffect(() => {
    if (joinNonce === 0) return undefined

    let cancelled = false

    connect('player', playerName, joinPrefs.roomCode.trim(), joinTableId, {
      playerId: joinPrefs.playerId,
      onHelloAck: (ack) => {
        if (cancelled) return
        if (!ack.ok) {
          setJoinError(ack.message)
          setJoinPhase('form')
          disconnect()
          return
        }
        if (ack.playerId) {
          setActivePlayerId(ack.playerId)
          setJoinPrefs((prev) => {
            const next = { ...prev, playerId: ack.playerId! }
            persistPlayerJoinPrefs(next)
            return next
          })
        }
        if (ack.restoredTableId && ack.restoredTableId !== LOBBY_TABLE_ID) {
          setLastTableId(ack.restoredTableId)
          showToast(`You're back at table ${ack.restoredTableId}`, 4500)
        }
        setJoinPhase('in_venue')
      },
    })

    const offState = onState((state) => {
      if (cancelled) return
      recordServerClockSample(state.serverNowMs ?? null)
      setGameState(state)
      setDisconnected(false)
    })
    const offToast = onToast((message) => showToast(message))
    const offSeated = onSeated(({ tableId }) => {
      setLastTableId(tableId)
      showToast(`You're at table ${tableId}`, 4500)
    })
    const offBrief = onPlayerVenueBrief(setVenueBrief)

    return () => {
      cancelled = true
      offState()
      offToast()
      offSeated()
      offBrief()
    }
  }, [joinNonce, playerName, joinPrefs.roomCode, joinPrefs.playerId, joinTableId, showToast])

  const handleForceReconnect = useCallback(() => {
    if (socket?.disconnected) {
      socket.connect()
      return
    }
    setJoinNonce((n) => n + 1)
  }, [socket])

  useEffect(() => {
    if (!socket) return undefined
    const onDisconnect = () => setDisconnected(true)
    const onConnect = () => setDisconnected(false)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)
    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
    }
  }, [socket])

  useEffect(() => {
    if (gameState?.phase === 'lobby') {
      setComposedAnswer(EMPTY_COMPOSED_ANSWER)
      setSelectedCards([])
      setSubmittedAnswerDisplay(null)
    }
  }, [gameState?.phase, gameState?.round.roundId])

  useEffect(() => {
    if (gameState?.phase === 'answering') return
    setSubmittedAnswerDisplay(null)
  }, [gameState?.phase, gameState?.round.roundId])

  const myIndex = gameState ? resolveMyPlayerIndex(gameState, playerName, socket?.id) : -1
  const currentPlayer = gameState && myIndex >= 0 ? gameState.players[myIndex] : undefined
  const handSummary = useHandSummary(gameState, currentPlayer)
  const tableResults = useTableResults(gameState, currentPlayer?.id ?? joinPrefs.playerId)
  const remainingSec = useAnswerCountdown(gameState?.round.answerDeadline)
  const turnRemainingSec = useAnswerCountdown(gameState?.round.turnDeadlineMs)

  const bettingCtx = useMemo(
    () =>
      gameState && currentPlayer
        ? buildBettingContext({ gameState, currentPlayer, myIndex, raiseAmount })
        : null,
    [gameState, currentPlayer, myIndex, raiseAmount],
  )

  // Keep raise sized to the legal minimum whenever the street / turn / min changes
  // (including while Waiting, so the dock never shows Raise $0).
  useEffect(() => {
    if (!bettingCtx?.isBettingPhase || bettingCtx.minRaise <= 0) return
    setRaiseAmount(bettingCtx.minRaise)
  }, [
    bettingCtx?.isBettingPhase,
    bettingCtx?.isMyTurn,
    bettingCtx?.minRaise,
    gameState?.round.roundId,
    gameState?.round.bettingRound,
    gameState?.round.currentPlayerIndex,
  ])

  useEffect(() => {
    setPreAction(null)
  }, [gameState?.round.roundId, gameState?.round.bettingRound])

  const wasMyTurnRef = useRef(false)
  const [turnFlash, setTurnFlash] = useState(false)
  useEffect(() => {
    const live = Boolean(bettingCtx?.isMyTurn)
    if (live && !wasMyTurnRef.current) {
      setTurnFlash(true)
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([40, 30, 40])
        }
      } catch {
        /* ignore */
      }
      const t = window.setTimeout(() => setTurnFlash(false), 900)
      wasMyTurnRef.current = live
      return () => window.clearTimeout(t)
    }
    wasMyTurnRef.current = live
    return undefined
  }, [bettingCtx?.isMyTurn])

  const preActTurnKeyRef = useRef('')
  useEffect(() => {
    if (!bettingCtx?.isMyTurn || !preAction || !gameState) return
    const turnKey = `${gameState.round.roundId}:${gameState.round.bettingRound}:${gameState.round.currentPlayerIndex}`
    if (preActTurnKeyRef.current === turnKey) return
    preActTurnKeyRef.current = turnKey
    const action = resolvePreAction(preAction, bettingCtx)
    setPreAction(null)
    if (action === 'check') checkAction()
    else if (action === 'call') callAction()
    else fold()
  }, [bettingCtx, preAction, gameState])

  const handleCardSelect = (type: 'hand' | 'community', index: number) => {
    if (!gameState || !currentPlayer || submittedAnswerDisplay) return
    const next = toggleCardInSelection({
      gameState,
      currentPlayer,
      selected: selectedCards,
      composed: composedAnswer,
      type,
      index,
    })
    if (next.error) showToast(next.error, 4000)
    setSelectedCards(next.selected)
    setComposedAnswer(next.composed)
  }

  const handleAnswerBackspace = () => {
    if (submittedAnswerDisplay) return
    const next = backspaceFromAnswer({ selected: selectedCards, composed: composedAnswer })
    setSelectedCards(next.selected)
    setComposedAnswer(next.composed)
  }

  const handleSubmitAnswer = () => {
    if (!gameState || submittedAnswerDisplay) return
    const err = validateAnswerSubmit(gameState.phase, selectedCards, composedAnswer)
    if (err) {
      showToast(err, 4000)
      return
    }
    const display = composedAnswer.display
    submitAnswer(composedAnswer.value, selectionToComposition(selectedCards), (ack) => {
      if (ack.ok) {
        setSubmittedAnswerDisplay(display)
        showToast(`Answer submitted: ${display}`)
      } else showToast(`Error: ${ack.message}`, 5000)
    })
  }

  if (joinPhase !== 'in_venue') {
    return (
      <JoinScreen
        prefs={joinPrefs}
        onChange={handleJoinPrefsChange}
        onJoin={handleJoin}
        joinError={joinError}
        isConnecting={joinPhase === 'connecting'}
      />
    )
  }

  if (!gameState) {
    return <ConnectingScreen />
  }

  const isEliminated =
    !currentPlayer &&
    (gameState.tableId ?? '') !== LOBBY_TABLE_ID &&
    gameState.phase !== 'lobby'

  if (isEliminated) {
    return <EliminatedScreen playerName={playerName} />
  }

  const inLobbyWaiting =
    (gameState.tableId ?? '') === LOBBY_TABLE_ID &&
    gameState.phase === 'lobby' &&
    currentPlayer != null

  if (inLobbyWaiting) {
    const waitingPosition = myIndex >= 0 ? myIndex + 1 : null
    return (
      <>
        <PlayerToast message={toastMessage} />
        <LobbyWaitingScreen
          playerName={playerName}
          venueCode={gameState.code}
          waitingCount={gameState.players.length}
          waitingPosition={waitingPosition}
          disconnected={disconnected}
          lastTableId={lastTableId}
          onReconnect={handleForceReconnect}
        />
      </>
    )
  }

  const showAnswerModal = gameState.phase === 'answering' && !!currentPlayer

  const seatedAtTable = (gameState.tableId ?? '') !== LOBBY_TABLE_ID
  const isBettingPhase = gameState.phase === 'betting'
  const needsMobileBetDock =
    isBettingPhase && !!currentPlayer && inChipContest(currentPlayer) && !currentPlayer.hasFolded

  const questionText = gameState.round.question?.text ?? ''
  const showStickyQuestion =
    Boolean(questionText) &&
    (gameState.phase === 'betting' || gameState.phase === 'answering' || gameState.phase === 'question')

  /**
   * Once seated at a felt: one viewport, no page scroll.
   * Meta / venue strip / phase essays / pot dashboards stay off-screen.
   */
  const liveFit = seatedAtTable
  const hideLiveChrome = seatedAtTable
  const layoutClass = [
    'player-game-layout',
    // Join layout padding/stack only for non-seated flows — seated uses live-fit alone.
    liveFit ? 'player-game-layout--live-fit' : 'player-join-layout',
    needsMobileBetDock ? 'player-game-layout--with-dock' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const feltView = (
    <TableFeltView
      gameState={gameState}
      playerName={playerName}
      myPlayerId={currentPlayer?.id ?? joinPrefs.playerId}
      myIndex={myIndex}
      showCenterPot={!showStickyQuestion}
      fillViewport={liveFit}
      turnRemainingSec={turnRemainingSec}
      playerOnline={gameState.playerOnline}
    />
  )

  const showSeatedLobbyWait = seatedAtTable && gameState.phase === 'lobby'
  /** Latched results mean a hand already finished; otherwise this is seat → start. */
  const waitingForFirstStart = showSeatedLobbyWait && !handSummary && !tableResults
  const showLastHand = Boolean(handSummary) && gameState.phase === 'lobby'
  const showTableResults =
    Boolean(tableResults) &&
    (gameState.phase === 'lobby' ||
      gameState.phase === 'reveal' ||
      gameState.phase === 'showdown' ||
      gameState.phase === 'payout')

  const mobileDock =
    needsMobileBetDock && bettingCtx && currentPlayer ? (
      <BettingMobileDock
        currentPlayer={currentPlayer}
        ctx={bettingCtx}
        raiseAmount={raiseAmount}
        pot={gameState.round.pot}
        preAction={preAction}
        onPreActionChange={setPreAction}
        onRaiseAmountChange={setRaiseAmount}
        onCheck={() => checkAction()}
        onCall={() => callAction()}
        onRaise={() => raiseAmount > 0 && raiseAction(raiseAmount)}
        onFold={() => fold()}
        onAllIn={() => allInAction()}
      />
    ) : null

  return (
    <PlayerGameScreen
      className={[
        liveFit ? 'player-game-screen--fit' : '',
        turnFlash ? 'player-game-screen--turn-flash' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PlayerToast message={toastMessage} />

      <div className={layoutClass}>
        <PlayerGameShell>
          <PlayerTableHeader
            disconnected={disconnected}
            lastTableId={lastTableId ?? gameState.tableId ?? undefined}
            onReconnect={handleForceReconnect}
            compactLive={liveFit}
          />
          {!liveFit ? <PlayerGoldHeaderRule /> : null}

          <div className="player-join-body player-game-body">
            {!hideLiveChrome ? (
              <PlayerGameStatusBar
                gameState={gameState}
                playerName={playerName}
                myIndex={myIndex}
                answerPoints={currentPlayer?.answerPoints ?? 0}
              />
            ) : null}

            {!hideLiveChrome ? (
              <VenueStatusStrip
                brief={venueBrief}
                tableBlinds={
                  currentPlayer && inChipContest(currentPlayer) && gameState.phase !== 'lobby'
                    ? { small: gameState.smallBlind, big: gameState.bigBlind }
                    : undefined
                }
              />
            ) : null}

            {showStickyQuestion ? (
              <StickyQuestionBar
                questionText={questionText}
                pot={gameState.round.pot}
                tableId={gameState.tableId}
              />
            ) : null}

            {!hideLiveChrome ? <PhaseBanner gameState={gameState} /> : null}

            {showSeatedLobbyWait ? (
              <p className="player-game-banner player-game-banner--compact">
                {waitingForFirstStart
                  ? `Table ${gameState.tableId} · seated with ${gameState.players.length} — waiting for the host to start…`
                  : `Table ${gameState.tableId} · waiting for the next question…`}
              </p>
            ) : null}

            {showLastHand ? (
              <div className="player-game-fit-scroll player-game-fit-scroll--solo">
                <PostHandSummaryCard summary={handSummary!} />
              </div>
            ) : null}
            {showTableResults ? (
              <div className="player-game-fit-scroll player-game-fit-scroll--solo">
                <TableResultsPanel results={tableResults!} />
              </div>
            ) : null}

            {/* Results own the middle — don't stack HUD under them (nested scroll). */}
            {seatedAtTable && !showTableResults && !showLastHand ? feltView : null}

            {!seatedAtTable ? (
              <GameInfoCard gameState={gameState} currentPlayer={currentPlayer} />
            ) : null}

            {isBettingPhase &&
            bettingCtx &&
            currentPlayer &&
            inChipContest(currentPlayer) &&
            !currentPlayer.hasFolded ? (
              <div className={needsMobileBetDock ? 'hidden lg:block' : ''}>
                <BettingActions
                  currentPlayer={currentPlayer}
                  ctx={bettingCtx}
                  raiseAmount={raiseAmount}
                  pot={gameState.round.pot}
                  onRaiseAmountChange={setRaiseAmount}
                  onCheck={() => checkAction()}
                  onCall={() => callAction()}
                  onRaise={() => raiseAmount > 0 && raiseAction(raiseAmount)}
                  onFold={() => fold()}
                  onAllIn={() => allInAction()}
                />
              </div>
            ) : null}

            {!seatedAtTable ? feltView : null}
          </div>
        </PlayerGameShell>

        {mobileDock}
      </div>

      <AnimatePresence>
        {showAnswerModal && currentPlayer ? (
          <AnswerComposerModal
            key={`answer-${gameState.round.roundId}`}
            gameState={gameState}
            currentPlayer={currentPlayer}
            composed={composedAnswer}
            selectedCards={selectedCards}
            remainingSec={remainingSec}
            submittedDisplay={submittedAnswerDisplay}
            onSelectCard={handleCardSelect}
            onToggleDecimal={() => {
              if (submittedAnswerDisplay) return
              setComposedAnswer((c) => toggleDecimal(c))
            }}
            onBackspace={handleAnswerBackspace}
            onClear={() => {
              if (submittedAnswerDisplay) return
              setComposedAnswer(EMPTY_COMPOSED_ANSWER)
              setSelectedCards([])
            }}
            onSubmit={handleSubmitAnswer}
            onEditSubmitted={() => setSubmittedAnswerDisplay(null)}
          />
        ) : null}
      </AnimatePresence>
    </PlayerGameScreen>
  )
}

export default PlayerApp
