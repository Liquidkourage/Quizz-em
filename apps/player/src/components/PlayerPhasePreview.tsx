import { useState } from 'react'
import { displayedMainPot, type GameState, type PlayerPhasePreviewId } from '@qhe/core'
import type { PlayerJoinBootstrap } from '../playerUrlParams'
import { EMPTY_COMPOSED_ANSWER } from '../playerModel/answerComposition'
import { buildBettingContext } from '../playerModel/bettingModel'
import { buildTableResults } from '../playerModel/tableResults'
import { PREVIEW_YOU_ID, playerPhaseGame } from '../playerPhaseFixture'
import JoinScreen from './JoinScreen'
import ConnectingScreen from './ConnectingScreen'
import LobbyWaitingScreen from './LobbyWaitingScreen'
import PlayerEndgameScreen from './PlayerEndgameScreen'
import PostHandSummaryCard from './PostHandSummaryCard'
import TableResultsPanel from './TableResultsPanel'
import AnswerComposerModal from './AnswerComposerModal'
import BettingMobileDock from './BettingMobileDock'
import TableFeltView from './TableFeltView'
import PlayerBettingTable from './PlayerBettingTable'
import { PlayerHoleSlot } from './PlayerHoleSlot'
import { TableIntroduction } from './TableIntroduction'
import StickyQuestionBar from './StickyQuestionBar'
import { PlayerTableHeader } from './PlayerTableHeader'
import { PlayerGameScreen, PlayerGameShell } from './PlayerGoldChrome'

const FELT_SCENES = new Set<PlayerPhasePreviewId>(['question', 'turn', 'guess', 'guess-locked', 'folded'])
const RESULT_SCENES = new Set<PlayerPhasePreviewId>(['results', 'between'])
const GATE_SCENES = new Set<PlayerPhasePreviewId>(['join', 'connecting', 'waiting', 'game-over'])

const joinPrefs: PlayerJoinBootstrap = {
  firstName: '',
  lastInitial: '',
  roomCode: '',
  autoSeat: true,
  tableId: 'LOBBY',
  playerId: PREVIEW_YOU_ID,
  roomFromUrl: false,
  nameFromUrl: false,
}

const betweenSummary = {
  stackDelta: -20,
  pointsGained: 0,
  submittedAnswer: 1500,
  correctAnswer: 1440,
  triviaPointsThisHand: 0,
  formattedSubmitted: '1,500',
  formattedCorrect: '1,440',
}

function noop() {}

function GatePreview({ scene }: { scene: PlayerPhasePreviewId }) {
  if (scene === 'connecting') return <ConnectingScreen />
  if (scene === 'waiting') {
    return (
      <LobbyWaitingScreen
        playerName="You Y"
        venueCode="QUIZ"
        waitingCount={4}
        waitingPosition={2}
        connectionStatus="connected"
        onQuit={noop}
      />
    )
  }
  if (scene === 'game-over') {
    return (
      <PlayerEndgameScreen
        winnerName="Ada A"
        chipNames={['Ada A']}
        pointsNames={['Bo B']}
        bankroll={null}
      />
    )
  }
  return <JoinScreen prefs={joinPrefs} onChange={noop} onJoin={noop} />
}

function TurnDock({
  game,
  youIndex,
  reserve = false,
}: {
  game: GameState
  youIndex: number
  reserve?: boolean
}) {
  const [raiseAmount, setRaiseAmount] = useState(20)
  const you = game.players[youIndex]
  if (!you) return null
  const ctx = buildBettingContext({ gameState: game, currentPlayer: you, myIndex: youIndex, raiseAmount })
  return (
    <BettingMobileDock
      currentPlayer={you}
      ctx={ctx}
      raiseAmount={raiseAmount}
      pot={game.round.pot}
      autoCallLimit={null}
      onAutoCallLimitChange={noop}
      onRaiseAmountChange={setRaiseAmount}
      onCheck={noop}
      onCall={noop}
      onRaise={noop}
      onFold={noop}
      onAllIn={noop}
      reserve={reserve}
    />
  )
}

function FeltBlock({ game, youIndex }: { game: GameState; youIndex: number }) {
  return (
    <div className="player-seated-table">
      <PlayerBettingTable gameState={game} myIndex={youIndex} />
      <div className="player-seated-felt">
        <TableFeltView
          gameState={game}
          playerName="You Y"
          myPlayerId={PREVIEW_YOU_ID}
          myIndex={youIndex}
          showCenterPot
          fillViewport
        />
      </div>
    </div>
  )
}

function ResultsBlock({ game }: { game: GameState }) {
  const results = buildTableResults(game, PREVIEW_YOU_ID)
  if (!results) return null
  return (
    <div className="player-game-fit-scroll player-game-fit-scroll--solo">
      <TableResultsPanel results={results} />
    </div>
  )
}

function ComposerBlock({ game, youIndex, locked }: { game: GameState; youIndex: number; locked: boolean }) {
  const you = game.players[youIndex]
  if (!you) return null
  return (
    <AnswerComposerModal
      gameState={game}
      currentPlayer={you}
      composed={EMPTY_COMPOSED_ANSWER}
      selectedCards={[]}
      remainingSec={45}
      submittedDisplay={locked ? '1,500' : null}
      onSelectCard={noop}
      onToggleDecimal={noop}
      onBackspace={noop}
      onClear={noop}
      onSubmit={noop}
      onEditSubmitted={noop}
    />
  )
}

function TableChrome({
  scene,
  game,
  youIndex,
  felt,
}: {
  scene: PlayerPhasePreviewId
  game: GameState
  youIndex: number
  felt: boolean
}) {
  return (
    <div className="player-join-body player-game-body">
      {felt ? (
        <StickyQuestionBar
          questionText={game.round.question?.text ?? ''}
          pot={displayedMainPot(game)}
          tableId={game.tableId}
        />
      ) : null}
      {scene === 'between' ? (
        <p className="player-game-banner player-game-banner--compact">
          Table 1 · waiting for the next question…
        </p>
      ) : null}
      {scene === 'table' ? (
        <TableIntroduction
          players={game.players}
          heroId={PREVIEW_YOU_ID}
          tableId={game.tableId}
          smallBlind={game.smallBlind}
          bigBlind={game.bigBlind}
          revealedCount={game.players.length}
        />
      ) : null}
      {scene === 'between' ? (
        <div className="player-between-split">
          <div className="player-game-fit-scroll player-game-fit-scroll--solo">
            <PostHandSummaryCard summary={betweenSummary} />
          </div>
          <ResultsBlock game={game} />
        </div>
      ) : RESULT_SCENES.has(scene) ? (
        <ResultsBlock game={game} />
      ) : null}
      {felt ? <FeltBlock game={game} youIndex={youIndex} /> : null}
    </div>
  )
}

function GuessOverlay({ scene, game, youIndex }: { scene: PlayerPhasePreviewId; game: GameState; youIndex: number }) {
  if (scene !== 'guess' && scene !== 'guess-locked') return null
  return <ComposerBlock game={game} youIndex={youIndex} locked={scene === 'guess-locked'} />
}

function TablePreview({ scene }: { scene: PlayerPhasePreviewId }) {
  const game = playerPhaseGame(scene)
  if (!game) return <GatePreview scene={scene} />
  const youIndex = game.players.findIndex((player) => player.id === PREVIEW_YOU_ID)
  const you = youIndex >= 0 ? game.players[youIndex] : undefined
  const felt = FELT_SCENES.has(scene)
  const layoutClass = `player-game-layout player-game-layout--live-fit${felt ? ' player-game-layout--with-dock' : ''}`
  const turnGame = playerPhaseGame('turn')
  const turnYou = turnGame?.players.findIndex((player) => player.id === PREVIEW_YOU_ID) ?? -1
  return (
    <PlayerGameScreen>
      <div className={layoutClass}>
        <PlayerGameShell>
          <PlayerTableHeader compactLive connectionStatus="connected" onQuit={noop} />
          <TableChrome scene={scene} game={game} youIndex={youIndex} felt={felt} />
          {felt ? <PlayerHoleSlot player={you} phase={game.phase} /> : null}
        </PlayerGameShell>
        {felt && scene !== 'turn' && turnGame && turnYou >= 0 ? (
          <TurnDock game={turnGame} youIndex={turnYou} reserve />
        ) : null}
        {scene === 'turn' ? <TurnDock game={game} youIndex={youIndex} /> : null}
      </div>
      <GuessOverlay scene={scene} game={game} youIndex={youIndex} />
    </PlayerGameScreen>
  )
}

/** The phone picture for one More-menu preview. Nothing here changes the live hand. */
export function PlayerPhasePreview({ scene }: { scene: PlayerPhasePreviewId }) {
  if (GATE_SCENES.has(scene)) return <GatePreview scene={scene} />
  return <TablePreview scene={scene} />
}
