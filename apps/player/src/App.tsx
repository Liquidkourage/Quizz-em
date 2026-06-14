import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  connect,
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
} from '@qhe/net'
import type { PlayerGameStateWire, PlayerVenueBrief } from '@qhe/net'
import { LOBBY_TABLE_ID, inChipContest } from '@qhe/core'
import { recordServerClockSample } from './serverClock'
import { readPlayerJoinPrefs, persistPlayerJoinPrefs, type PlayerJoinPrefs } from './playerUrlParams'
import { useAnswerCountdown } from './hooks/useAnswerCountdown'
import { useHandSummary } from './hooks/useHandSummary'
import {
  EMPTY_COMPOSED_ANSWER,
  selectionToComposition,
  toggleCardInSelection,
  toggleDecimal,
  validateAnswerSubmit,
  type ComposedAnswer,
  type SelectedCardRef,
} from './playerModel/answerComposition'
import { buildBettingContext, resolveMyPlayerIndex } from './playerModel/bettingModel'
import JoinScreen from './components/JoinScreen'
import ConnectingScreen from './components/ConnectingScreen'
import EliminatedScreen from './components/EliminatedScreen'
import PlayerToast from './components/PlayerToast'
import PlayerTableHeader from './components/PlayerTableHeader'
import VenueStatusStrip from './components/VenueStatusStrip'
import PhaseBanner from './components/PhaseBanner'
import GameInfoCard from './components/GameInfoCard'
import PostHandSummaryCard from './components/PostHandSummaryCard'
import RevealShowdownPanel from './components/RevealShowdownPanel'
import AnswerComposer from './components/AnswerComposer'
import BettingActions from './components/BettingActions'
import BettingMobileDock from './components/BettingMobileDock'
import AnswerMobileDock from './components/AnswerMobileDock'
import OtherPlayersGrid from './components/OtherPlayersGrid'

function PlayerApp() {
  const [joinPrefs, setJoinPrefs] = useState<PlayerJoinPrefs>(() => readPlayerJoinPrefs())
  const [isJoined, setIsJoined] = useState(false)
  const [gameState, setGameState] = useState<PlayerGameStateWire | null>(null)
  const [venueBrief, setVenueBrief] = useState<PlayerVenueBrief | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [disconnected, setDisconnected] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState(0)
  const [composedAnswer, setComposedAnswer] = useState<ComposedAnswer>(EMPTY_COMPOSED_ANSWER)
  const [selectedCards, setSelectedCards] = useState<SelectedCardRef[]>([])
  const socket = useSocket()

  const playerName = joinPrefs.playerName.trim()
  const joinTableId = joinPrefs.autoSeat
    ? LOBBY_TABLE_ID
    : String(joinPrefs.tableId || '').trim() || LOBBY_TABLE_ID

  const showToast = useCallback((message: string, ms = 3500) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), ms)
  }, [])

  const handleJoin = () => {
    if (!playerName || !joinPrefs.roomCode.trim()) return
    if (!joinPrefs.autoSeat && !String(joinPrefs.tableId || '').trim()) return
    persistPlayerJoinPrefs(joinPrefs)
    connect('player', playerName, joinPrefs.roomCode.trim(), joinTableId)
    setIsJoined(true)
  }

  useEffect(() => {
    if (!isJoined) return undefined

    const offState = onState((state) => {
      recordServerClockSample(state.serverNowMs ?? null)
      setGameState(state)
      setDisconnected(false)
    })
    const offToast = onToast((message) => showToast(message))
    const offSeated = onSeated(({ tableId }) => showToast(`You're at table ${tableId}`, 4500))
    const offBrief = onPlayerVenueBrief(setVenueBrief)

    return () => {
      offState()
      offToast()
      offSeated()
      offBrief()
    }
  }, [isJoined, showToast])

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
    }
  }, [gameState?.phase, gameState?.round.roundId])

  const currentPlayer = gameState?.players.find((p) => p.name === playerName)
  const myIndex = gameState ? resolveMyPlayerIndex(gameState, playerName, socket?.id) : -1
  const handSummary = useHandSummary(gameState, currentPlayer)
  const remainingSec = useAnswerCountdown(gameState?.round.answerDeadline)

  const bettingCtx = useMemo(
    () =>
      gameState && currentPlayer
        ? buildBettingContext({ gameState, currentPlayer, myIndex, raiseAmount })
        : null,
    [gameState, currentPlayer, myIndex, raiseAmount]
  )

  const handleCardSelect = (type: 'hand' | 'community', index: number) => {
    if (!gameState || !currentPlayer) return
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

  const handleSubmitAnswer = () => {
    if (!gameState) return
    const err = validateAnswerSubmit(gameState.phase, selectedCards, composedAnswer)
    if (err) {
      showToast(err, 4000)
      return
    }
    submitAnswer(composedAnswer.value, selectionToComposition(selectedCards), (ack) => {
      if (ack.ok) showToast(`Answer submitted: ${composedAnswer.display}`)
      else showToast(`Error: ${ack.message}`, 5000)
    })
  }

  if (!isJoined) {
    return <JoinScreen prefs={joinPrefs} onChange={setJoinPrefs} onJoin={handleJoin} />
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

  const showAnswerComposer =
    !!currentPlayer &&
    !currentPlayer.hasFolded &&
    ((gameState.phase === 'betting' && inChipContest(currentPlayer)) || gameState.phase === 'answering')

  const needsMobileBetDock =
    gameState.phase === 'betting' && !!currentPlayer && inChipContest(currentPlayer) && !currentPlayer.hasFolded

  const needsMobileAnswerDock = gameState.phase === 'answering' && !!currentPlayer && !currentPlayer.hasFolded

  const mainPadding = [
    'relative z-10 px-3 pt-3 pb-6 sm:px-5 sm:pt-4 sm:pb-8 md:p-8',
    needsMobileBetDock ? 'max-lg:pb-[calc(17.5rem+env(safe-area-inset-bottom,0px))]' : '',
    needsMobileAnswerDock && !needsMobileBetDock
      ? 'max-lg:pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  const canSubmitAnswer =
    gameState.phase === 'answering' &&
    selectedCards.length === 5 &&
    composedAnswer.display.trim().length > 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-casino-gradient">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />
        <div className="absolute inset-0 animate-float bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10" />
      </div>

      <PlayerToast message={toastMessage} />

      <div className={mainPadding}>
        <PlayerTableHeader
          gameState={gameState}
          playerName={playerName}
          myIndex={myIndex}
          answerPoints={currentPlayer?.answerPoints ?? 0}
          disconnected={disconnected}
        />

        <VenueStatusStrip
          brief={venueBrief}
          tableBlinds={
            currentPlayer && inChipContest(currentPlayer) && gameState.phase !== 'lobby'
              ? { small: gameState.smallBlind, big: gameState.bigBlind }
              : undefined
          }
        />

        <PhaseBanner gameState={gameState} />

        {handSummary && gameState.phase === 'lobby' ? <PostHandSummaryCard summary={handSummary} /> : null}

        <GameInfoCard gameState={gameState} currentPlayer={currentPlayer} />

        {currentPlayer ? <RevealShowdownPanel gameState={gameState} currentPlayer={currentPlayer} /> : null}

        {showAnswerComposer && currentPlayer ? (
          <AnswerComposer
            gameState={gameState}
            currentPlayer={currentPlayer}
            composed={composedAnswer}
            selectedCards={selectedCards}
            remainingSec={remainingSec}
            hideActions={needsMobileAnswerDock}
            onSelectCard={handleCardSelect}
            onToggleDecimal={() => setComposedAnswer((c) => toggleDecimal(c))}
            onClear={() => {
              setComposedAnswer(EMPTY_COMPOSED_ANSWER)
              setSelectedCards([])
            }}
            onSubmit={handleSubmitAnswer}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {currentPlayer ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md sm:p-5">
              <div className="text-sm text-white/70">Your stack</div>
              <div className="text-3xl font-bold text-casino-gold">${currentPlayer.bankroll}</div>
              {currentPlayer.hasFolded ? (
                <div className="mt-2 text-lg font-bold text-red-400">Folded this hand</div>
              ) : null}
            </div>
          ) : null}

          {bettingCtx && currentPlayer && inChipContest(currentPlayer) && !currentPlayer.hasFolded ? (
            <div className={needsMobileBetDock ? 'hidden lg:block' : ''}>
              <BettingActions
                currentPlayer={currentPlayer}
                ctx={bettingCtx}
                raiseAmount={raiseAmount}
                onRaiseAmountChange={setRaiseAmount}
                onCheck={() => checkAction()}
                onCall={() => callAction()}
                onRaise={() => raiseAmount > 0 && raiseAction(raiseAmount)}
                onFold={() => fold()}
                onAllIn={() => allInAction()}
              />
            </div>
          ) : null}
        </div>

        <OtherPlayersGrid gameState={gameState} playerName={playerName} />
      </div>

      {needsMobileBetDock && bettingCtx && currentPlayer ? (
        <BettingMobileDock
          currentPlayer={currentPlayer}
          ctx={bettingCtx}
          raiseAmount={raiseAmount}
          onRaiseAmountChange={setRaiseAmount}
          onCheck={() => checkAction()}
          onCall={() => callAction()}
          onRaise={() => raiseAmount > 0 && raiseAction(raiseAmount)}
          onFold={() => fold()}
          onAllIn={() => allInAction()}
        />
      ) : null}

      {needsMobileAnswerDock ? (
        <AnswerMobileDock
          remainingSec={remainingSec}
          canSubmit={canSubmitAnswer}
          onClear={() => {
            setComposedAnswer(EMPTY_COMPOSED_ANSWER)
            setSelectedCards([])
          }}
          onSubmit={handleSubmitAnswer}
        />
      ) : null}
    </div>
  )
}

export default PlayerApp
