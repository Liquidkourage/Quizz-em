import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createEmptyGame,
  addPlayer,
  removePlayer,
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
  revealAnswer,
  endRound,
  isSubmittedAnswerComposableFromDeal,
  adminCloseBetting,
  adminAdvanceTurn,
  computeOptimalTableCount,
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
  venueCondenseDisplayFields,
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
  runVirtualPlayerSimulation,
  tableIsCpuOnly,
  liveVirtualCount,
} from './virtual-players'
import {
  isPostBoardWageringClosed,
  openAnsweringPhase,
  planVenueWageringOrchestration,
} from './venue-wagering-orchestration'
import { applyVenueCondenseAfterRound, venueCondenseSnapshotFromRooms } from './venue-condense'
import {
  buildHostVenueFloorBrief,
  clearVenueHostLog,
  recordVenueHostHandResults,
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

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())

/** Vite SPAs: never cache `index.html` (avoids stale chunk references after deploy); hashed assets may be immutable. */
function mountSpaStatic(urlPath: string, distRelFromCompiledServer: string) {
  const rootDir = path.join(__dirname, distRelFromCompiledServer)
  app.use(
    urlPath,
    express.static(rootDir, {
      index: 'index.html',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
          res.setHeader('Pragma', 'no-cache')
          res.setHeader('Expires', '0')
          return
        }
        const norm = filePath.replace(/\\/g, '/')
        if (norm.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
}

// Lightweight health checks (Railway / load balancers)
app.get('/health', (_req, res) => {
  res.status(200).type('text').send('ok')
})

// Serve static files for all apps
mountSpaStatic('/host', '../../host/dist')
mountSpaStatic('/player', '../../player/dist')
mountSpaStatic('/display', '../../display/dist')

// Test route for debugging cards
app.get('/test-cards', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Card Variants Test</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        .card-variant {
          width: 96px;
          height: 144px;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          margin: 10px;
          display: inline-block;
        }
        
        .card-glass {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(0,255,180,0.8);
          box-shadow: 0 4px 12px rgba(0,255,180,0.3);
        }
        
        .card-solid {
          background: linear-gradient(135deg, rgba(0,255,180,0.4), rgba(0,255,180,0.2));
          border: 3px solid rgb(0,255,180);
          box-shadow: 0 4px 12px rgba(0,255,180,0.3);
        }
        
        .card-gradient {
          background: linear-gradient(135deg, rgba(0,255,180,0.6), rgba(0,255,180,0.3), rgba(0,255,180,0.1));
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 6px 20px rgba(0,255,180,0.3);
        }
        
        .card-neon {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
        }
        
        .card-neon-pulse {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-pulse 2s ease-in-out infinite;
        }
        
        .card-neon-flicker {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-flicker 0.5s ease-in-out infinite;
        }
        
        .card-neon-rainbow {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-rainbow 3s linear infinite;
        }
        
        .card-neon-matrix {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-matrix 4s ease-in-out infinite;
        }
        
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2); }
          50% { box-shadow: 0 0 30px rgb(0,255,180), 0 0 60px rgba(0,255,180,0.6), inset 0 0 30px rgba(0,255,180,0.3); }
        }
        
        @keyframes neon-flicker {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2); }
          25% { box-shadow: 0 0 10px rgb(0,255,180), 0 0 20px rgba(0,255,180,0.2), inset 0 0 10px rgba(0,255,180,0.1); }
          50% { box-shadow: 0 0 25px rgb(0,255,180), 0 0 50px rgba(0,255,180,0.5), inset 0 0 25px rgba(0,255,180,0.25); }
          75% { box-shadow: 0 0 15px rgb(0,255,180), 0 0 30px rgba(0,255,180,0.3), inset 0 0 15px rgba(0,255,180,0.15); }
        }
        
        @keyframes neon-rainbow {
          0% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, 0 0 40px rgba(255,0,0,0.4), inset 0 0 20px rgba(255,0,0,0.2); }
          16.66% { border-color: #ff8000; box-shadow: 0 0 20px #ff8000, 0 0 40px rgba(255,128,0,0.4), inset 0 0 20px rgba(255,128,0,0.2); }
          33.33% { border-color: #ffff00; box-shadow: 0 0 20px #ffff00, 0 0 40px rgba(255,255,0,0.4), inset 0 0 20px rgba(255,255,0,0.2); }
          50% { border-color: #00ff00; box-shadow: 0 0 20px #00ff00, 0 0 40px rgba(0,255,0,0.4), inset 0 0 20px rgba(0,255,0,0.2); }
          66.66% { border-color: #0080ff; box-shadow: 0 0 20px #0080ff, 0 0 40px rgba(0,128,255,0.4), inset 0 0 20px rgba(0,128,255,0.2); }
          83.33% { border-color: #8000ff; box-shadow: 0 0 20px #8000ff, 0 0 40px rgba(128,0,255,0.4), inset 0 0 20px rgba(128,0,255,0.2); }
          100% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, 0 0 40px rgba(255,0,0,0.4), inset 0 0 20px rgba(255,0,0,0.2); }
        }
        
        @keyframes neon-matrix {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2); }
          25% { box-shadow: 0 0 25px rgb(0,255,180), 0 0 50px rgba(0,255,180,0.5), inset 0 0 25px rgba(0,255,180,0.25); }
          50% { box-shadow: 0 0 30px rgb(0,255,180), 0 0 60px rgba(0,255,180,0.6), inset 0 0 30px rgba(0,255,180,0.3); }
          75% { box-shadow: 0 0 25px rgb(0,255,180), 0 0 50px rgba(0,255,180,0.5), inset 0 0 25px rgba(0,255,180,0.25); }
        }
        
        .card-neon-matrix-cyan {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,255);
          box-shadow: 0 0 20px rgb(0,255,255), 0 0 40px rgba(0,255,255,0.4), inset 0 0 20px rgba(0,255,255,0.2);
          animation: neon-matrix-cyan 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-pink {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(255,105,180);
          box-shadow: 0 0 20px rgb(255,105,180), 0 0 40px rgba(255,105,180,0.4), inset 0 0 20px rgba(255,105,180,0.2);
          animation: neon-matrix-pink 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-orange {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(255,165,0);
          box-shadow: 0 0 20px rgb(255,165,0), 0 0 40px rgba(255,165,0,0.4), inset 0 0 20px rgba(255,165,0,0.2);
          animation: neon-matrix-orange 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-lime {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(50,205,50);
          box-shadow: 0 0 20px rgb(50,205,50), 0 0 40px rgba(50,205,50,0.4), inset 0 0 20px rgba(50,205,50,0.2);
          animation: neon-matrix-lime 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-violet {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(148,0,211);
          box-shadow: 0 0 20px rgb(148,0,211), 0 0 40px rgba(148,0,211,0.4), inset 0 0 20px rgba(148,0,211,0.2);
          animation: neon-matrix-violet 4s ease-in-out infinite;
        }
        
        @keyframes neon-matrix-cyan {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,255), 0 0 40px rgba(0,255,255,0.4), inset 0 0 20px rgba(0,255,255,0.2); }
          25% { box-shadow: 0 0 25px rgb(0,255,255), 0 0 50px rgba(0,255,255,0.5), inset 0 0 25px rgba(0,255,255,0.25); }
          50% { box-shadow: 0 0 30px rgb(0,255,255), 0 0 60px rgba(0,255,255,0.6), inset 0 0 30px rgba(0,255,255,0.3); }
          75% { box-shadow: 0 0 25px rgb(0,255,255), 0 0 50px rgba(0,255,255,0.5), inset 0 0 25px rgba(0,255,255,0.25); }
        }
        
        @keyframes neon-matrix-pink {
          0%, 100% { box-shadow: 0 0 20px rgb(255,105,180), 0 0 40px rgba(255,105,180,0.4), inset 0 0 20px rgba(255,105,180,0.2); }
          25% { box-shadow: 0 0 25px rgb(255,105,180), 0 0 50px rgba(255,105,180,0.5), inset 0 0 25px rgba(255,105,180,0.25); }
          50% { box-shadow: 0 0 30px rgb(255,105,180), 0 0 60px rgba(255,105,180,0.6), inset 0 0 30px rgba(255,105,180,0.3); }
          75% { box-shadow: 0 0 25px rgb(255,105,180), 0 0 50px rgba(255,105,180,0.5), inset 0 0 25px rgba(255,105,180,0.25); }
        }
        
        @keyframes neon-matrix-orange {
          0%, 100% { box-shadow: 0 0 20px rgb(255,165,0), 0 0 40px rgba(255,165,0,0.4), inset 0 0 20px rgba(255,165,0,0.2); }
          25% { box-shadow: 0 0 25px rgb(255,165,0), 0 0 50px rgba(255,165,0,0.5), inset 0 0 25px rgba(255,165,0,0.25); }
          50% { box-shadow: 0 0 30px rgb(255,165,0), 0 0 60px rgba(255,165,0,0.6), inset 0 0 30px rgba(255,165,0,0.3); }
          75% { box-shadow: 0 0 25px rgb(255,165,0), 0 0 50px rgba(255,165,0,0.5), inset 0 0 25px rgba(255,165,0,0.25); }
        }
        
        @keyframes neon-matrix-lime {
          0%, 100% { box-shadow: 0 0 20px rgb(50,205,50), 0 0 40px rgba(50,205,50,0.4), inset 0 0 20px rgba(50,205,50,0.2); }
          25% { box-shadow: 0 0 25px rgb(50,205,50), 0 0 50px rgba(50,205,50,0.5), inset 0 0 25px rgba(50,205,50,0.25); }
          50% { box-shadow: 0 0 30px rgb(50,205,50), 0 0 60px rgba(50,205,50,0.6), inset 0 0 30px rgba(50,205,50,0.3); }
          75% { box-shadow: 0 0 25px rgb(50,205,50), 0 0 50px rgba(50,205,50,0.5), inset 0 0 25px rgba(50,205,50,0.25); }
        }
        
        @keyframes neon-matrix-violet {
          0%, 100% { box-shadow: 0 0 20px rgb(148,0,211), 0 0 40px rgba(148,0,211,0.4), inset 0 0 20px rgba(148,0,211,0.2); }
          25% { box-shadow: 0 0 25px rgb(148,0,211), 0 0 50px rgba(148,0,211,0.5), inset 0 0 25px rgba(148,0,211,0.25); }
          50% { box-shadow: 0 0 30px rgb(148,0,211), 0 0 60px rgba(148,0,211,0.6), inset 0 0 30px rgba(148,0,211,0.3); }
          75% { box-shadow: 0 0 25px rgb(148,0,211), 0 0 50px rgba(148,0,211,0.5), inset 0 0 25px rgba(148,0,211,0.25); }
        }
        
        .card-back {
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 2px solid rgba(0,255,180,0.8);
          box-shadow: 0 0 20px rgba(0,255,180,0.3);
        }
        
        .card-back::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: repeating-linear-gradient(
            45deg,
            rgba(0,255,180,0.2),
            rgba(0,255,180,0.2) 2px,
            transparent 2px,
            transparent 8px
          );
          border-radius: 8px;
        }
        
        .card-back-diamond::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: 
            radial-gradient(circle at 25% 25%, rgba(0,255,180,0.3) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(0,255,180,0.3) 2px, transparent 2px);
          border-radius: 8px;
        }
        
        .card-back-heart::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: conic-gradient(
            from 0deg,
            rgba(0,255,180,0.4),
            transparent 60deg,
            rgba(0,255,180,0.4),
            transparent 120deg,
            rgba(0,255,180,0.4),
            transparent 180deg,
            rgba(0,255,180,0.4),
            transparent 240deg,
            rgba(0,255,180,0.4),
            transparent 300deg,
            rgba(0,255,180,0.4)
          );
          border-radius: 8px;
        }
        
        .card-back-crown::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: linear-gradient(
            45deg,
            rgba(0,255,180,0.4) 25%,
            transparent 25%,
            transparent 75%,
            rgba(0,255,180,0.4) 75%
          );
          border-radius: 8px;
        }
        
        .card-back-circuit::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: 
            repeating-linear-gradient(90deg, rgba(0,255,180,0.25) 1px, transparent 1px, transparent 3px),
            repeating-linear-gradient(0deg, rgba(0,255,180,0.25) 1px, transparent 1px, transparent 3px);
          border-radius: 8px;
        }
        
        .card-back-cosmic::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: 
            radial-gradient(circle at 20% 20%, rgba(0,255,180,0.4) 2px, transparent 2px),
            radial-gradient(circle at 80% 80%, rgba(0,255,180,0.35) 2px, transparent 2px),
            radial-gradient(circle at 40% 60%, rgba(0,255,180,0.3) 2px, transparent 2px),
            radial-gradient(circle at 60% 40%, rgba(0,255,180,0.35) 2px, transparent 2px);
          border-radius: 8px;
        }
        
        .card-digit {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 48px;
          font-weight: bold;
          color: black;
          z-index: 10;
        }
        
        .card-digit.neon {
          color: rgb(0,255,180);
          text-shadow: 0 0 12px rgb(0,255,180);
        }
        
        .card-corner {
          position: absolute;
          font-weight: bold;
          color: rgb(0,255,180);
          z-index: 10;
          font-size: 18px;
        }
        
        .card-corner.top-left {
          top: 4px;
          left: 4px;
        }
        
        .card-corner.bottom-right {
          bottom: 4px;
          right: 4px;
          transform: rotate(180deg);
        }
        
        .card-corner.neon {
          text-shadow: 0 0 8px rgb(0,255,180);
        }
        
        .card-center-logo {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: rgb(0,255,180);
          font-weight: bold;
          transform: translateY(-7px);
        }
        
        .card-center-logo > div {
          background: rgba(0,0,0,0.3);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 10px rgb(0,255,180);
        }
      </style>
    </head>
    <body style="background: linear-gradient(135deg, #1f2937, #7c3aed, #1f2937); min-height: 100vh; padding: 20px;">
      <h1 style="color: white; text-align: center; margin-bottom: 30px;">🎰 Card Variants Test</h1>
      
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="color: white; margin-bottom: 20px;">Front Card Styles</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Glass Style (Default)</h3>
          <div class="card-variant card-glass">
            <div class="card-corner top-left">7</div>
            <div class="card-corner bottom-right">7</div>
            <div class="card-digit">
              <span style="background: linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5)); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">7</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Solid Style</h3>
          <div class="card-variant card-solid">
            <div class="card-corner top-left">7</div>
            <div class="card-corner bottom-right">7</div>
            <div class="card-digit">
              <span style="background: linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5)); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">7</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Gradient Style</h3>
          <div class="card-variant card-gradient">
            <div class="card-corner top-left">7</div>
            <div class="card-corner bottom-right">7</div>
            <div class="card-digit">
              <span style="background: linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5)); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">7</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Neon Variants</h3>
          <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Standard</h4>
              <div class="card-variant card-neon">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Pulse</h4>
              <div class="card-variant card-neon-pulse">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Flicker</h4>
              <div class="card-variant card-neon-flicker">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Rainbow</h4>
              <div class="card-variant card-neon-rainbow">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Emerald)</h4>
              <div class="card-variant card-neon-matrix">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Cyan)</h4>
              <div class="card-variant card-neon-matrix-cyan">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,255); border: 1px solid rgb(0,255,255);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Pink)</h4>
              <div class="card-variant card-neon-matrix-pink">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(255,105,180); border: 1px solid rgb(255,105,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Orange)</h4>
              <div class="card-variant card-neon-matrix-orange">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(255,165,0); border: 1px solid rgb(255,165,0);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Lime)</h4>
              <div class="card-variant card-neon-matrix-lime">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(50,205,50); border: 1px solid rgb(50,205,50);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Violet)</h4>
              <div class="card-variant card-neon-matrix-violet">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(148,0,211); border: 1px solid rgb(148,0,211);">7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="color: white; margin-bottom: 20px;">Card Back Designs</h2>
        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Spade</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>♠</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Diamond</h4>
            <div class="card-variant card-back card-back-diamond">
              <div class="card-center-logo">
                <div>♦</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Club</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>♣</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Heart</h4>
            <div class="card-variant card-back card-back-heart">
              <div class="card-center-logo">
                <div>✦</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Star</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>★</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Crown</h4>
            <div class="card-variant card-back card-back-crown">
              <div class="card-center-logo">
                <div>👑</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Joker</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>🃏</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Geometric</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>◆</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Circuit</h4>
            <div class="card-variant card-back card-back-circuit">
              <div class="card-center-logo">
                <div>⚡</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Cosmic</h4>
            <div class="card-variant card-back card-back-cosmic">
              <div class="card-center-logo">
                <div>⭐</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Neon</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>✦</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <h2 style="color: white; margin-bottom: 20px;">Color Variants</h2>
        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Emerald</h4>
            <div class="card-variant card-glass"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Gold</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(255,215,0,0.8); box-shadow: 0 4px 12px rgba(255,215,0,0.3);"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Purple</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(139,92,246,0.8); box-shadow: 0 4px 12px rgba(139,92,246,0.3);"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Red</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(255,68,68,0.8); box-shadow: 0 4px 12px rgba(255,68,68,0.3);"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Blue</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(59,130,246,0.8); box-shadow: 0 4px 12px rgba(59,130,246,0.3);"></div>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 40px; text-align: center;">
        <p style="color: white;">These are the different card styles available in the game!</p>
        <p style="color: white;">Use <code>style="neon"</code> with <code>neonVariant</code>: 'standard', 'pulse', 'flicker', 'rainbow', or 'matrix'</p>
        <p style="color: white;">Use <code>faceDown={true}</code> with <code>backDesign</code>: 'spade', 'diamond', 'club', 'heart', 'star', 'crown', or 'joker'</p>
      </div>
    </body>
    </html>
  `)
})

// Serve the main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
              <title>Quizz\u2019em</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%);
          color: white;
          margin: 0;
          padding: 20px;
          min-height: 100vh;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 2rem;
          text-shadow: 0 0 20px #00FFB4;
        }
        .links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 2rem;
        }
        .link {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 10px;
          text-decoration: none;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        .link:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }
        .link h2 {
          margin: 0 0 10px 0;
          color: #00FFB4;
        }
        .link p {
          margin: 0;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎰 Quizz\u2019em</h1>
        <p>Welcome to the ultimate Vegas casino experience!</p>
        
        <div class="links">
          <a href="/host" class="link">
            <h2>🎮 Host Control Panel</h2>
            <p>Manage the game and control the flow</p>
          </a>
          <a href="/player" class="link">
            <h2>👤 Player Interface</h2>
            <p>Join the game and play your hand</p>
          </a>
          <a href="/display" class="link">
            <h2>📺 Display Screen</h2>
            <p>Public display for spectators</p>
          </a>
        </div>
      </div>
    </body>
    </html>
  `)
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

function normalizeVenueCode(roomCode: string): string {
  return roomCode.trim().toUpperCase()
}

function normalizeTableId(tableId: string | undefined): string {
  const t = (tableId ?? '1').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || '1'
  return t
}

/** One isolated table roster + deck + phase inside a venue (maps to sockets + persisted state key). */
function tableSessionKey(venueCode: string, tableId?: string): string {
  return `${normalizeVenueCode(venueCode)}:${normalizeTableId(tableId)}`
}

const rooms = new Map<string, any>()
const answerTimers = new Map<string, NodeJS.Timeout>()
const venueShowdownTimers = new Map<string, NodeJS.Timeout>()
const venueShowdownAtMs = new Map<string, number>()
const venueOrchestrationGuard = new Set<string>()
let venueLibraries!: Map<string, VenueLibraryData>
const venuePlayhead = new Map<string, { setlistId: string | null; nextIndex: number }>()

function clearTableAnswerTimer(sessionKey: string) {
  const prev = answerTimers.get(sessionKey)
  if (prev) clearTimeout(prev)
  answerTimers.delete(sessionKey)
}

function scheduleTableAnswerReveal(sessionKey: string, deadlineMs: number) {
  clearTableAnswerTimer(sessionKey)
  const delay = Math.max(0, deadlineMs - Date.now())
  const timer = setTimeout(() => {
    const cur = rooms.get(sessionKey)
    if (!cur || cur.phase !== 'answering') return
    const revealed = revealAnswer(cur)
    rooms.set(sessionKey, revealed)
    emitVenueTableState(sessionKey, revealed, { skipOrchestration: true })
    io.to(sessionKey).emit('toast', '⏱️ Time up! Revealing answers...')
  }, delay)
  answerTimers.set(sessionKey, timer)
}

function clearVenueShowdownTimer(venueCode: string) {
  const vn = normalizeVenueCode(venueCode)
  const prev = venueShowdownTimers.get(vn)
  if (prev) clearTimeout(prev)
  venueShowdownTimers.delete(vn)
}

function clearVenueWageringOrchestrationState(venueCode: string) {
  const vn = normalizeVenueCode(venueCode)
  clearVenueShowdownTimer(vn)
  venueShowdownAtMs.delete(vn)
  for (const tk of allTableSessionsInVenue(vn)) {
    clearTableAnswerTimer(tk)
  }
}

function scheduleVenueShowdownTimer(venueCode: string, fireAtMs: number) {
  const vn = normalizeVenueCode(venueCode)
  clearVenueShowdownTimer(vn)
  venueShowdownAtMs.set(vn, fireAtMs)
  const delay = Math.max(0, fireAtMs - Date.now())
  venueShowdownTimers.set(
    vn,
    setTimeout(() => {
      executeVenueShowdown(vn)
    }, delay)
  )
}

function executeVenueShowdown(vnRaw: string) {
  const vn = normalizeVenueCode(vnRaw)
  clearVenueShowdownTimer(vn)
  venueShowdownAtMs.delete(vn)
  for (const tk of allSeatedTableSessionsInVenue(vn)) {
    let gs = rooms.get(tk)
    if (!gs) continue
    clearTableAnswerTimer(tk)

    if (gs.phase === 'betting' && gs.round.isBettingOpen === true) {
      gs = adminCloseBetting(gs)
    }
    if (isPostBoardWageringClosed(gs)) {
      gs = openAnsweringPhase(gs, Date.now())
    }
    gs = runVirtualPlayerSimulation(gs)
    if (gs.phase === 'answering') {
      gs = revealAnswer(gs)
    }
    rooms.set(tk, gs)
    io.to(tk).emit('state', gs)
  }
  emitDisplayVenueSnapshotNow(vn)
  io.to(hostVenueRoom(vn)).emit('toast', 'Answer window closed — showdown on all tables.')
}

function applyVenueWageringOrchestration(venueCode: string) {
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

    if (plan.cancelShowdown) {
      clearVenueShowdownTimer(vn)
    } else if (plan.scheduleShowdownAtMs != null) {
      scheduleVenueShowdownTimer(vn, plan.scheduleShowdownAtMs)
      io.to(hostVenueRoom(vn)).emit(
        'toast',
        'Last table finished wagering — showdown in 45 seconds.',
      )
    }

    if (plan.tableUpdates.length === 0) return

    for (const update of plan.tableUpdates) {
      let gs = runVirtualPlayerSimulation(update.gameState)
      rooms.set(update.sessionKey, gs)
      io.to(update.sessionKey).emit('state', gs)
      if (update.answerDeadlineMs != null) {
        scheduleTableAnswerReveal(update.sessionKey, update.answerDeadlineMs)
      } else {
        clearTableAnswerTimer(update.sessionKey)
      }
    }
    emitDisplayVenueSnapshotNow(vn)
  } finally {
    venueOrchestrationGuard.delete(vn)
  }
}

async function persistVenues() {
  await persistVenueLibraries(venueLibraries)
}

function hostVenueRoom(venueCode: string): string {
  return `HOST:${normalizeVenueCode(venueCode)}`
}

function displayVenueRoom(venueCode: string): string {
  return `DISPLAY:${normalizeVenueCode(venueCode)}`
}

function playerVenueRoom(venueCode: string): string {
  return `PLAYER:${normalizeVenueCode(venueCode)}`
}

function buildPlayerVenueBrief(vnRaw: string): PlayerVenueBrief {
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
  const condenseDisplay = venueCondenseDisplayFields({
    liveTableCount: condenseCounts.liveTableCount,
    chipSurvivorCount: condenseCounts.chipSurvivorCount,
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
    venueNextCondenseAtSurvivors: condenseDisplay.nextCondenseAtSurvivors,
  }
}

function emitPlayerVenueBriefNow(vnRaw: string) {
  io.to(playerVenueRoom(vnRaw)).emit('playerVenueBrief', buildPlayerVenueBrief(vnRaw))
}

const venueDisplayLayouts = new Map<string, DisplayLayoutPayload>()

function normalizeDisplayFocusTable(raw: unknown): number | null {
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

function parseDisplaySetLayoutPayload(payload: unknown): DisplayLayoutPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.layout !== 'venueWall') return null
  return normalizeDisplayLayoutPayload(p)
}

/** Normalize persisted or legacy payloads (older builds stored `singleTable`). */
function coerceDisplayLayoutPayload(raw: unknown): DisplayLayoutPayload {
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

function resolveDisplayLayoutForHello(venueCode: string, data: ClientHello): DisplayLayoutPayload {
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

const DISPLAY_PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short code ↔ waiting display socket until host claims pairing */
type DisplayPairingPending = { socketId: string; created: number }
const displayPairByCode = new Map<string, DisplayPairingPending>()
const displayPairCodeBySocketId = new Map<string, string>()

type DisplaySockData = {
  sessionKey?: string
  role?: string
  hostAuthed?: boolean
  displayAwaitPairing?: boolean
  displayClientName?: string
}

function clearDisplayPairingForSocket(socketId: string) {
  const code = displayPairCodeBySocketId.get(socketId)
  if (!code) return
  displayPairCodeBySocketId.delete(socketId)
  displayPairByCode.delete(code)
}

function mintDisplayPairingCode(): string {
  for (let attempts = 0; attempts < 120; attempts++) {
    let s = ''
    for (let i = 0; i < 4; i++) {
      s += DISPLAY_PAIRING_ALPHABET[Math.floor(Math.random() * DISPLAY_PAIRING_ALPHABET.length)]!
    }
    if (!displayPairByCode.has(s)) return s
  }
  return `Z${(100 + Math.floor(Math.random() * 900)).toString()}`
}

function assignDisplayPairing(socket: Socket): string {
  clearDisplayPairingForSocket(socket.id)
  const code = mintDisplayPairingCode()
  displayPairByCode.set(code, { socketId: socket.id, created: Date.now() })
  displayPairCodeBySocketId.set(socket.id, code)
  return code
}

/** Join DISPLAY:{venue}, route layouts & felt session — shared by hello + pairing attach */
function wireDisplaySocketToVenue(socket: Socket, venueCodeRaw: string, data: ClientHello) {
  const vn = normalizeVenueCode(venueCodeRaw)
  const sockData = socket.data as DisplaySockData
  sockData.displayAwaitPairing = false

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

async function ensureVenueLibrary(venueCode: string): Promise<VenueLibraryData> {
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

function getPlayhead(venueCode: string) {
  return (
    venuePlayhead.get(normalizeVenueCode(venueCode)) ?? {
      setlistId: null,
      nextIndex: 0,
    }
  )
}

async function buildHostLibraryPayload(venueCode: string) {
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
function syncVenueBlindsToAllSessions(vn: string) {
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

async function emitHostLibrary(venueCode: string) {
  io.to(hostVenueRoom(venueCode)).emit('hostLibrary', await buildHostLibraryPayload(venueCode))
}

function pruneIdFromAllSetlists(lib: VenueLibraryData, questionId: string) {
  for (const sl of lib.setlists) {
    sl.questionIds = sl.questionIds.filter((id) => id !== questionId)
  }
}

function sanitizeSetlistQuestionIds(lib: VenueLibraryData, ids: string[]): string[] {
  const known = new Set(lib.questions.map((q) => q.id))
  return ids.filter((id) => known.has(id))
}

function assertVenueHost(socket: Socket, gs: { hostId: string }): boolean {
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
  if (socket.id !== gs.hostId) {
    socket.emit('toast', 'Only the venue host for this bound table can control the game.')
    return false
  }
  return true
}

function getActiveSessionKey(socket: Socket): string | undefined {
  const fromData = (socket.data as { sessionKey?: string }).sessionKey
  if (typeof fromData === 'string' && fromData.length > 0) return fromData
  const ids = Array.from(socket.rooms)
  return ids.length > 1 ? ids[1] : undefined
}

/** Socket map keys belonging to every table in one venue (`VENUE:tableId`). */
function venueSessionKeyPrefix(venueCode: string): string {
  return `${normalizeVenueCode(venueCode)}:`
}

function isLobbySessionKey(sessionKey: string): boolean {
  return sessionKey.endsWith(`:${LOBBY_TABLE_ID}`)
}

function allVenueSessionKeys(venueCode: string): string[] {
  const pref = venueSessionKeyPrefix(venueCode)
  return [...rooms.keys()].filter(k => k.startsWith(pref)).sort()
}

/** Playable tables only (excludes lobby pool). */
function allTableSessionsInVenue(venueCode: string): string[] {
  return allVenueSessionKeys(venueCode).filter(k => !isLobbySessionKey(k))
}

/** Numbered felts with at least one seated player — lockstep host cues ignore empty sessions. */
function allSeatedTableSessionsInVenue(venueCode: string): string[] {
  return allTableSessionsInVenue(venueCode).filter((tk) => {
    const gs = rooms.get(tk)
    return gs != null && gs.players.length > 0
  })
}

/** Seats labeled on the public venue-wall mosaic (matches felt chair count in UI). */
const VENUE_WALL_SEAT_COUNT = VENUE_WALL_SEAT_SLOTS

/** Seats wired into the venue wall / welcome mosaic (human + rehearsal CPU vp:*). */
function welcomeWallSeatCount(gs: GameState): number {
  return gs.players.length
}

/** Hidden on displays after venue-wide Start Game until New Game resets the venue. */
const venueAudienceWelcomeExpired = new Set<string>()

function markVenueShowStarted(code: string): void {
  const vn = normalizeVenueCode(code)
  if (!venueAudienceWelcomeExpired.has(vn)) {
    venueAudienceWelcomeExpired.add(vn)
    emitDisplayVenueSnapshotNow(vn)
  }
}

function tableNumFromSessionKey(venueCode: string, sessionKey: string): number | null {
  const vn = normalizeVenueCode(venueCode)
  const pref = `${vn}:`
  if (!sessionKey.startsWith(pref)) return null
  const rest = sessionKey.slice(pref.length)
  if (rest === LOBBY_TABLE_ID) return null
  const n = Number.parseInt(rest, 10)
  if (!Number.isInteger(n) || n < 1 || n > VENUE_NUMBERED_TABLE_MAX || String(n) !== rest) return null
  return n
}

function moveHumanToTableSession(playerId: string, toSessionKey: string, tableId: string): void {
  const sock = io.sockets.sockets.get(playerId)
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

function runVenueCondenseAfterRound(vnRaw: string, hostId: string): string[] {
  const vn = normalizeVenueCode(vnRaw)
  const result = applyVenueCondenseAfterRound({
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
  })
  return result.hostToasts
}

/**
 * Phase / street fingerprint for lockstep venues: every playable table session must match
 * before cross-table host actions advance the show together.
 */
function phaseStrictSignature(gs: GameState): string {
  const r = gs.round
  const phase = gs.phase
  if (phase === 'betting') {
    const br = typeof r?.bettingRound === 'number' && Number.isFinite(r.bettingRound) ? Math.floor(r.bettingRound) : '?'
    const openRaw = r?.isBettingOpen
    const open = openRaw === true ? 'T' : openRaw === false ? 'F' : '?'
    const cc = Array.isArray(r?.communityCards) ? r.communityCards.length : 0
    return `bet|${br}|${open}|cc${cc}`
  }
  if (phase === 'answering') {
    const dl = typeof r?.answerDeadline === 'number' && Number.isFinite(r.answerDeadline) ? Math.floor(r.answerDeadline) : '?'
    return `answer|dl${dl}`
  }
  return String(phase)
}

function humanReadableStrictState(gs: GameState): string {
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
  if (ph === 'showdown') return 'showdown'
  if (ph === 'question') return 'deal setup'
  if (ph === 'lobby') return 'lobby between hands'
  return ph
}

function venuePlayableSnapshots(venueCode: string): { tk: string; n: number; gs: GameState }[] {
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

function toastVenueMisaligned(socket: Socket, rows: { n: number; gs: GameState }[]): void {
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
  socket.emit(
    'toast',
    `Tables are out of sync (${parts.join(' · ')}). Fix the stragglers so every felt matches before advancing.`,
  )
}

/**
 * Ensures every existing numbered session in `venueCode` shares the same strict phase fingerprint
 * and satisfies `predicate` for the initiating action — otherwise emits a toast and returns null.
 */
function requireVenueLockstepTables(
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
function requireAllSeatedTablesSatisfy(
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
const VENUE_WALL_HEADLINE_PHASES = new Set<string>([
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
function pickVenueHeadlineSource(venueCode: string): { gs: GameState; tableNum: number } | null {
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

function buildHostVenueFeltBeatPayload(vnRaw: string): { felts: HostVenueFeltBeatRow[] } {
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
    })
  }
  return { felts }
}

function emitDisplayVenueSnapshotNow(vnRaw: string) {
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
      if (p == null || p.hasFolded || p.hand.length < 2) return null
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
    let seatAnswerCommunityIndices: (readonly number[] | null)[] | undefined
    let seatChipPayout: (number | null)[] | undefined
    if (gs.phase === 'answering' || gs.phase === 'showdown' || gs.phase === 'reveal') {
      seatSubmittedAnswers = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
        const p = gs.players[i]
        if (p == null || p.hasFolded) return null
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
        if (p == null || p.hasFolded || typeof p.submittedAnswer !== 'number') return null
        const comp = answerCompositionForPlayer(p, gs.round.communityCards)
        if (comp == null) return null
        const idx = communityIndicesFromAnswerComposition(comp)
        return idx.length > 0 ? idx : null
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
      seatLastBettingAction,
      actingCallAmount,
      actingCallPctOfStack,
      ...(seatHoleDigits.some((h) => h != null) ? { seatHoleDigits } : {}),
      ...(communityDigits != null && communityDigits.length > 0 ? { communityDigits } : {}),
      ...(showdownAnswer != null ? { showdownAnswer, showdownQuestionText: showdownQuestionText ?? null } : {}),
      ...(seatSubmittedAnswers != null ? { seatSubmittedAnswers } : {}),
      ...(seatAnswerCommunityIndices != null &&
      seatAnswerCommunityIndices.some((x) => x != null && x.length > 0)
        ? { seatAnswerCommunityIndices }
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

  const headlineSource = pickVenueHeadlineSource(vn)
  const headlineGs = headlineSource?.gs ?? null
  let headlineQuestionText: string | null = null
  let headlineQuestionAnswer: number | null = null
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
  const condenseDisplay = venueCondenseDisplayFields({
    liveTableCount: condenseCounts.liveTableCount,
    chipSurvivorCount: condenseCounts.chipSurvivorCount,
  })

  const payload: DisplayVenueWallSnapshot = {
    tiles,
    headlineQuestionText,
    headlineQuestionAnswer,
    answerDeadlineMs,
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
    venueLiveTableCount: condenseCounts.liveTableCount,
    venueChipSurvivorCount: condenseCounts.chipSurvivorCount,
    venueNextCondenseAtSurvivors: condenseDisplay.nextCondenseAtSurvivors,
    venueTargetTablesAfterCondense: condenseDisplay.targetTablesAfterCondense,
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
    }),
  )
}

function afterTableStateBroadcast(gs: GameState, _sessionKey: string) {
  /** Immediate refresh — debouncing was dropping every intermediate state during VP sims. */
  emitDisplayVenueSnapshotNow(gs.code)
}

/** Emit felt state then refresh DISPLAY:{venue} wall summaries for numbered felts */
function emitVenueTableState(
  sessionKey: string,
  gs: GameState,
  opts?: { skipOrchestration?: boolean }
) {
  io.to(sessionKey).emit('state', { ...gs, serverNowMs: Date.now() })
  afterTableStateBroadcast(gs, sessionKey)
  if (!opts?.skipOrchestration) {
    applyVenueWageringOrchestration(gs.code)
  }
}

/**
 * Pure `vp:*` felts — advance one bot step at a time with a human-visible pause so the
 * venue wall can be read between decisions (demo / watch mode).
 */
const cpuVpDrainPending = new Set<string>()
/** One wagering/answering VP step per timer tick (not 72 micro-steps at once). */
const CPU_VP_STEPS_PER_CHUNK = 1

/**
 * Pace between paced CPU-only wagering steps (`drainCpuVpSessionChain`).
 * Default ~3–7s random so the venue wall stays readable during demos.
 * Set **`QHE_CPU_VP_ACTION_DELAY_MS`** on the server to a nonnegative integer (e.g. `0` or `50`)
 * when rehearsing large all-CPU fields (many seats × multiple felts → venue lockstep).
 */
function cpuVpDelayMsBetweenActions(): number {
  const raw = process.env.QHE_CPU_VP_ACTION_DELAY_MS?.trim()
  if (raw !== undefined && raw !== '') {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 0) return Math.min(n, 120_000)
  }
  const min = 3000
  const max = 7000
  return min + Math.floor(Math.random() * (max - min + 1))
}

function enqueueCpuOnlyVpDrain(sessionKey: string) {
  if (cpuVpDrainPending.has(sessionKey)) return
  cpuVpDrainPending.add(sessionKey)
  setImmediate(() => drainCpuVpSessionChain(sessionKey))
}

function drainCpuVpSessionChain(sessionKey: string) {
  let gs = rooms.get(sessionKey)
  if (!gs || !tableIsCpuOnly(gs)) {
    cpuVpDrainPending.delete(sessionKey)
    return
  }

  let s = gs
  let steps = 0
  while (steps < CPU_VP_STEPS_PER_CHUNK) {
    const next = advanceVirtualBettingStep(s)
    if (next === s) break
    s = next
    steps++
  }

  rooms.set(sessionKey, s)
  emitVenueTableState(sessionKey, s)

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

function applyQuestionToAllPlayable(venueCode: string, picked: Question): boolean {
  const playable = allSeatedTableSessionsInVenue(venueCode)
  for (const tk of playable) {
    let gs = rooms.get(tk)
    gs = setQuestion(gs, picked)
    gs = runVirtualPlayerSimulation(gs)
    rooms.set(tk, gs)
    emitVenueTableState(tk, gs!)
  }
  autoDealHoleCardsOnVenue(venueCode)
  return openBettingAfterQuestionOnVenue(venueCode)
}

/** Deal hole cards on every seated table in question setup (no blinds yet). */
function autoDealHoleCardsOnVenue(venueCode: string): boolean {
  const vn = normalizeVenueCode(venueCode)
  const rows = venuePlayableSnapshots(vn)
  if (rows.length === 0) return false
  if (!rows.every((r) => r.gs.phase === 'question')) return false

  let anyDealt = false
  for (const { tk } of rows) {
    let gs = rooms.get(tk)
    if (!gs || gs.phase !== 'question' || gs.players.length === 0) continue
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
function openBettingAfterQuestionOnVenue(venueCode: string): boolean {
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
const VENUE_SYNC_ACTION_TYPES = new Set<string>([
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
  'assignTablesFromLobby'
])

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('hello', async (data: ClientHello) => {
    const { role, name, roomCode } = data

    const requiredHostSecret = process.env.HOST_SECRET?.trim()
    if (role === 'host' && requiredHostSecret) {
      const provided =
        typeof (data as { hostSecret?: string }).hostSecret === 'string'
          ? (data as { hostSecret: string }).hostSecret.trim()
          : ''
      if (provided !== requiredHostSecret) {
        socket.emit('ack', { ok: false, message: 'Invalid host credentials.' })
        socket.disconnect(true)
        return
      }
    }

    if (role === 'display' && data.displayAwaitPairing === true) {
      const sd = socket.data as DisplaySockData
      sd.role = 'display'
      sd.displayAwaitPairing = true
      sd.displayClientName = name
      clearDisplayPairingForSocket(socket.id)
      const code = assignDisplayPairing(socket)
      socket.emit('displayPairingCode', { code })
      socket.emit('ack', { ok: true, message: 'Await pairing from host.' })
      return
    }

    const venueCode = normalizeVenueCode(roomCode)
    const tableId = normalizeTableId(data.tableId)
    const helloSessionKey = tableSessionKey(venueCode, tableId)

    if (role !== 'display') {
      const candidateExists = !!rooms.get(helloSessionKey)
      if (
        tableId !== LOBBY_TABLE_ID &&
        role === 'player' &&
        !candidateExists
      ) {
        socket.emit('ack', {
          ok: false,
          message:
            'That table has not opened yet. Join via the lobby until the host seats everyone.',
        })
        return
      }
      if (tableId !== LOBBY_TABLE_ID && role === 'host' && !candidateExists) {
        socket.emit('ack', {
          ok: false,
          message:
            'Host from LOBBY until tables exist. Connect with ?table=LOBBY (default) until after Assign from lobby.',
        })
        return
      }
    }

    const sockData = socket.data as DisplaySockData
    sockData.role = role
    if (role === 'host') {
      sockData.hostAuthed = true
    }

    if (role === 'host') {
      socket.join(hostVenueRoom(venueCode))
      socket.emit('hostLibrary', await buildHostLibraryPayload(venueCode))
      emitDisplayVenueSnapshotNow(venueCode)
    }

    if (role === 'display') {
      wireDisplaySocketToVenue(socket, venueCode, data)
      return
    }

    socket.join(helloSessionKey)
    sockData.sessionKey = helloSessionKey

    let gameState = rooms.get(helloSessionKey)
    if (!gameState) {
      gameState = applyEffectiveBlindsToGameState(
        createEmptyGame(venueCode, '', tableId),
        venueCode,
        helloSessionKey,
      )
      rooms.set(helloSessionKey, gameState)
    }

    if (role === 'host') {
      gameState = { ...gameState, hostId: socket.id }
      const vn = normalizeVenueCode(venueCode)
      for (const tk of allVenueSessionKeys(vn)) {
        const gs = rooms.get(tk)
        if (gs) rooms.set(tk, { ...gs, hostId: socket.id })
      }
    }

    if (role === 'player') {
      socket.join(playerVenueRoom(venueCode))
      gameState = addPlayer(gameState, socket.id, name)
    }

    gameState = runVirtualPlayerSimulation(gameState)
    rooms.set(helloSessionKey, gameState)

    const ack: ServerAck = { ok: true, message: 'Connected successfully' }
    socket.emit('ack', ack)

    emitVenueTableState(helloSessionKey, gameState)
    if (role === 'player') {
      emitPlayerVenueBriefNow(venueCode)
    }
  })

  socket.on('action', async (data: any) => {
    const { type, payload } = data

    if (type === 'displaySetLayout') {
      const sessionKey = getActiveSessionKey(socket)
      if (!sessionKey) {
        socket.emit('toast', 'No room found')
        return
      }
      const gsCtl = rooms.get(sessionKey)
      if (!gsCtl) {
        socket.emit('toast', 'Game not found')
        return
      }
      if (!assertVenueHost(socket, gsCtl)) {
        return
      }
      const nextLayout = parseDisplaySetLayoutPayload(payload)
      if (!nextLayout) {
        socket.emit(
          'toast',
          `Invalid TV layout (send venue wall + optional focus table 1–${VENUE_NUMBERED_TABLE_MAX}).`,
        )
        return
      }
      venueDisplayLayouts.set(normalizeVenueCode(gsCtl.code), nextLayout)
      io.to(displayVenueRoom(gsCtl.code)).emit('displayLayout', nextLayout)
      emitDisplayVenueSnapshotNow(gsCtl.code)
      socket.emit('toast', 'TV / display layout updated for the venue.')
      return
    }

    if (type === 'pairDisplayWithHost') {
      const sessionKey = getActiveSessionKey(socket)
      if (!sessionKey) {
        socket.emit('toast', 'No room found')
        return
      }
      const gsCtl = rooms.get(sessionKey)
      if (!gsCtl) {
        socket.emit('toast', 'Game not found')
        return
      }
      if (!assertVenueHost(socket, gsCtl)) {
        return
      }
      const raw = typeof payload?.code === 'string' ? payload.code : ''
      const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (code.length !== 4) {
        socket.emit('toast', 'Enter the 4-character code from the TV.')
        socket.emit('ack', { ok: false, message: 'Invalid code length' })
        return
      }
      const pend = displayPairByCode.get(code)
      if (!pend) {
        socket.emit('toast', 'No display is waiting with that code.')
        socket.emit('ack', { ok: false, message: 'Unknown code' })
        return
      }
      const dSock = io.sockets.sockets.get(pend.socketId)
      if (!dSock) {
        displayPairByCode.delete(code)
        displayPairCodeBySocketId.delete(pend.socketId)
        socket.emit('toast', 'That display went offline. Refresh the TV to get a new code.')
        socket.emit('ack', { ok: false, message: 'Display offline' })
        return
      }
      const dsd = dSock.data as DisplaySockData
      if (!dsd.displayAwaitPairing) {
        socket.emit('toast', 'That code was already used.')
        socket.emit('ack', { ok: false, message: 'Code consumed' })
        return
      }

      clearDisplayPairingForSocket(pend.socketId)

      const vn = normalizeVenueCode(gsCtl.code)
      const displayName = typeof dsd.displayClientName === 'string' && dsd.displayClientName.trim() !== ''
        ? dsd.displayClientName.trim()
        : "Quizz'em TV"

      const bindHello: ClientHello = {
        role: 'display',
        name: displayName,
        roomCode: vn,
        tableId: '1',
        displayVenueWall: true,
        displayFocusTable: null,
      }

      wireDisplaySocketToVenue(dSock, vn, bindHello)
      dSock.emit('displayVenueAssigned', { venueCode: vn })

      socket.emit('ack', { ok: true, message: 'Display paired.' })
      socket.emit('toast', 'TV paired — it should join this venue now.')
      return
    }

    const sessionKey = getActiveSessionKey(socket)
    
    if (!sessionKey) {
      socket.emit('toast', 'No room found')
      return
    }
    
    let gameState = rooms.get(sessionKey)
    if (!gameState) {
      socket.emit('toast', 'Game not found')
      return
    }

    try {
      switch (type) {
        case 'startGame': {
          if (!assertVenueHost(socket, gameState)) break
          const vnStart = normalizeVenueCode(gameState.code)
          const rowsStart = venuePlayableSnapshots(vnStart)
          if (rowsStart.length === 0) {
            socket.emit('toast', 'No playable tables yet — assign from lobby first.')
            break
          }
          const sig0 = phaseStrictSignature(rowsStart[0]!.gs)
          let startMisaligned = false
          for (let i = 1; i < rowsStart.length; i++) {
            if (phaseStrictSignature(rowsStart[i]!.gs) !== sig0) {
              toastVenueMisaligned(socket, rowsStart)
              startMisaligned = true
              break
            }
          }
          if (startMisaligned) break

          const sample = rowsStart[0]!.gs
          if (sample.phase === 'question') {
            autoDealHoleCardsOnVenue(gameState.code)
            socket.emit(
              'toast',
              'Felts are already in deal setup — skip Start and use Reveal question or Next from setlist.',
            )
            gameState = rooms.get(sessionKey)!
            break
          }
          if (sample.phase !== 'lobby') {
            socket.emit(
              'toast',
              `Every table must be in lobby before starting the trivia wave (yours collectively: ${humanReadableStrictState(sample)}). Run End round & pay out if the last hand finished.`,
            )
            break
          }
          clearVenueWageringOrchestrationState(gameState.code)
          for (const { tk } of rowsStart) {
            let gs = rooms.get(tk)
            gs = startGame(gs)
            gs = runVirtualPlayerSimulation(gs)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          autoDealHoleCardsOnVenue(gameState.code)
          socket.emit(
            'toast',
            'Round started — hole cards dealt on every table. Reveal a question to open wagering.',
          )
          markVenueShowStarted(gameState.code)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setQuestion': {
          if (!assertVenueHost(socket, gameState)) break
          const lockQ = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'lobby' || gs.phase === 'question',
            'stay together in lobby or deal setup before changing the question'
          )
          if (!lockQ) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const questionIdRaw = payload?.questionId
          const questionId = typeof questionIdRaw === 'string' ? questionIdRaw.trim() : ''
          let picked: Question | undefined
          if (questionId.length > 0) {
            picked = bank.find((q) => q.id === questionId)
            if (!picked) {
              socket.emit('toast', 'That question is not in your bank.')
              break
            }
          } else {
            picked = pickRandomQuestion(bank)
            if (!picked) {
              socket.emit('toast', 'Question bank is empty — add questions or restore the starter pack.')
              break
            }
          }
          const bettingOpened = applyQuestionToAllPlayable(gameState.code, picked)
          await emitHostLibrary(gameState.code)
          socket.emit(
            'toast',
            bettingOpened
              ? 'Question revealed — wagering round 1 open (all tables).'
              : 'Question synced — deal hole cards first (Start the round), then reveal again if needed.',
          )
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'nextQuestionFromSetlist': {
          if (!assertVenueHost(socket, gameState)) break
          const lockSl = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'lobby' || gs.phase === 'question',
            'stay together in lobby or deal setup before the next setlist cue'
          )
          if (!lockSl) break
          const venue = normalizeVenueCode(gameState.code)
          const lib = await ensureVenueLibrary(gameState.code)
          let ph = getPlayhead(venue)
          if (!ph.setlistId) {
            socket.emit('toast', 'Select a setlist for this game first.')
            break
          }
          const sl = lib.setlists.find((s) => s.id === ph.setlistId)
          if (!sl) {
            socket.emit('toast', 'Active setlist was removed — pick another.')
            venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
            await emitHostLibrary(venue)
            break
          }
          let dispatched = false
          while (ph.nextIndex < sl.questionIds.length) {
            const qid = sl.questionIds[ph.nextIndex]
            const pos = ph.nextIndex + 1
            ph = { ...ph, nextIndex: ph.nextIndex + 1 }
            venuePlayhead.set(venue, ph)
            const qFound = lib.questions.find((q) => q.id === qid)
            if (qFound) {
              const bettingOpened = applyQuestionToAllPlayable(gameState.code, qFound)
              await emitHostLibrary(gameState.code)
              socket.emit(
                'toast',
                bettingOpened
                  ? `Setlist “${sl.name}”: question ${pos} of ${sl.questionIds.length} — wagering round 1 open.`
                  : `Setlist “${sl.name}”: question ${pos} of ${sl.questionIds.length} → all tables (start the round first if holes are missing).`,
              )
              gameState = rooms.get(sessionKey)!
              dispatched = true
              break
            }
          }
          if (!dispatched && ph.nextIndex >= sl.questionIds.length) {
            await emitHostLibrary(venue)
            socket.emit(
              'toast',
              `End of setlist “${sl.name}” (or remaining ids missing from bank). Pick another rundown or free play.`
            )
          }
          break
        }

        case 'selectTriviaSetlist': {
          if (!assertVenueHost(socket, gameState)) break
          const venue = normalizeVenueCode(gameState.code)
          const lib = await ensureVenueLibrary(venue)
          const raw = payload?.setlistId
          if (raw == null || raw === '') {
            venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
            await emitHostLibrary(venue)
            socket.emit('toast', 'Setlist rundown cleared — free play from the full bank.')
            break
          }
          const id = String(raw).trim()
          if (!lib.setlists.some((s) => s.id === id)) {
            socket.emit('toast', 'That setlist does not exist.')
            break
          }
          venuePlayhead.set(venue, { setlistId: id, nextIndex: 0 })
          await emitHostLibrary(venue)
          const sel = lib.setlists.find((s) => s.id === id)!
          socket.emit(
            'toast',
            `Active rundown: “${sel.name}” — ${sel.questionIds.length} question(s); use Next from setlist for cue 1.`
          )
          break
        }

        case 'setlistCreate': {
          if (!assertVenueHost(socket, gameState)) break
          const name = String(payload?.name ?? '').trim()
          if (!name) {
            socket.emit('toast', 'Setlist needs a name.')
            break
          }
          const lib = await ensureVenueLibrary(gameState.code)
          const id = `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
          lib.setlists.push({ id, name, questionIds: [] })
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', `Setlist created: ${name}`)
          break
        }

        case 'setlistSave': {
          if (!assertVenueHost(socket, gameState)) break
          const id = String(payload?.id ?? '').trim()
          if (!id) {
            socket.emit('toast', 'setlistSave requires id.')
            break
          }
          const lib = await ensureVenueLibrary(gameState.code)
          const idx = lib.setlists.findIndex((s) => s.id === id)
          if (idx < 0) {
            socket.emit('toast', 'Setlist not found.')
            break
          }
          const prev = lib.setlists[idx]
          const name =
            typeof payload?.name === 'string' && payload.name.trim()
              ? payload.name.trim()
              : prev.name
          let questionIds = prev.questionIds
          if (Array.isArray(payload?.questionIds)) {
            questionIds = sanitizeSetlistQuestionIds(
              lib,
              (payload.questionIds as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.trim()),
            )
          }
          lib.setlists[idx] = { id: prev.id, name, questionIds }
          await persistVenues()
          const ph = getPlayhead(normalizeVenueCode(gameState.code))
          if (ph.setlistId === id && ph.nextIndex > questionIds.length) {
            venuePlayhead.set(normalizeVenueCode(gameState.code), {
              setlistId: id,
              nextIndex: Math.max(0, questionIds.length),
            })
          }
          await emitHostLibrary(gameState.code)
          socket.emit('toast', `Setlist “${name}” saved (${questionIds.length} questions).`)
          break
        }

        case 'setlistDelete': {
          if (!assertVenueHost(socket, gameState)) break
          const id = String(payload?.id ?? '').trim()
          const venue = normalizeVenueCode(gameState.code)
          const lib = await ensureVenueLibrary(venue)
          const next = lib.setlists.filter((s) => s.id !== id)
          if (next.length === lib.setlists.length) {
            socket.emit('toast', 'Setlist not found.')
            break
          }
          lib.setlists = next
          await persistVenues()
          const ph = getPlayhead(venue)
          if (ph.setlistId === id) {
            venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
          }
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Setlist removed.')
          break
        }

        case 'dealInitialCards': {
          if (!assertVenueHost(socket, gameState)) break
          const lockDeal = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'question',
            'wait in deal setup before hole cards or opening wagering',
          )
          if (!lockDeal) break
          const vn = normalizeVenueCode(gameState.code)
          const rows = venuePlayableSnapshots(vn)
          const allHaveQuestion = rows.every((r) => r.gs.round.question != null)
          const allHaveHoles = rows.every((r) => playersHaveHoleCards(r.gs))
          if (allHaveQuestion && allHaveHoles) {
            if (openBettingAfterQuestionOnVenue(gameState.code)) {
              socket.emit('toast', 'Wagering round 1 open (all tables).')
            } else {
              socket.emit('toast', 'Could not open wagering — check every table has hole cards and a question.')
            }
          } else if (!allHaveHoles) {
            if (autoDealHoleCardsOnVenue(gameState.code)) {
              if (allHaveQuestion && openBettingAfterQuestionOnVenue(gameState.code)) {
                socket.emit('toast', 'Hole cards dealt — wagering round 1 open (all tables).')
              } else {
                socket.emit('toast', 'Hole cards dealt — reveal a question to open wagering.')
              }
            } else {
              socket.emit('toast', 'Could not deal — every seated table must be in question setup.')
            }
          } else {
            socket.emit('toast', 'Reveal a question first — wagering opens after trivia is shown.')
          }
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'dealCommunityCards': {
          if (!assertVenueHost(socket, gameState)) break
          const lockBoard = requireAllSeatedTablesSatisfy(
            socket,
            gameState.code,
            (gs) =>
              gs.phase === 'betting' &&
              gs.round.bettingRound === 1 &&
              (gs.round.communityCards?.length ?? 0) < 5,
            'be in pre-board wagering (round 1, board empty) before dealing community cards',
          )
          if (!lockBoard) break
          clearVenueWageringOrchestrationState(gameState.code)
          let anyDealt = false
          let anyAutoClosed = false
          for (const { tk } of lockBoard) {
            let gs = rooms.get(tk)
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
              emitVenueTableState(tk, gs)
              if (tableIsCpuOnly(gs)) {
                enqueueCpuOnlyVpDrain(tk)
              } else {
                gs = runVirtualPlayerSimulation(gs)
                rooms.set(tk, gs)
                emitVenueTableState(tk, gs)
              }
              io.to(tk).emit('dealingCommunityCards')
              const boardTableNum = tableNumFromSessionKey(gs.code, tk)
              if (boardTableNum != null) {
                io.to(displayVenueRoom(normalizeVenueCode(gs.code))).emit('dealingCommunityCards', {
                  tableNum: boardTableNum,
                })
              }
            } else {
              emitVenueTableState(tk, gs)
            }
          }
          if (anyDealt) {
            socket.emit(
              'toast',
              anyAutoClosed
                ? 'Closed round 1 + dealt board — wagering round 2 (every table at this venue).'
                : 'Board complete — wagering round 2 (every table at this venue).',
            )
          } else {
            socket.emit('toast', 'Board failed to deal — reload from host if this persists.')
          }
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'startAnswering': {
          if (!assertVenueHost(socket, gameState)) break
          const lockAns = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) =>
              gs.phase === 'betting' &&
              gs.round.isBettingOpen === false &&
              gs.round.bettingRound === 2 &&
              (gs.round.communityCards?.length ?? 0) >= 5,
            'finish post-board wagering (clock closed) with a complete board before trivia answers open',
          )
          if (!lockAns) break
          const vn = normalizeVenueCode(gameState.code)
          clearVenueWageringOrchestrationState(vn)
          const durationSec = resolveAnswerWindowSecondsForStart(vn, payload)
          const durationMs = durationSec * 1000
          const deadlineMs2 = Date.now() + durationMs
          for (const { tk } of lockAns) {
            let gs = rooms.get(tk)
            gs = {
              ...gs,
              phase: 'answering',
              round: { ...gs.round, answerDeadline: deadlineMs2 }
            }
            gs = runVirtualPlayerSimulation(gs)
            scheduleTableAnswerReveal(tk, deadlineMs2)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs, { skipOrchestration: true })
          }
          socket.emit(
            'toast',
            `Answering opened — ${lockAns.length} table(s); ${durationSec}s countdown at each felt.`,
          )
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setVenueAnswerWindow': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const raw = Number((payload as { seconds?: unknown })?.seconds)
          if (!Number.isFinite(raw)) {
            socket.emit(
              'toast',
              `Set answer window to a number between ${ANSWER_WINDOW_MIN_SEC} and ${ANSWER_WINDOW_MAX_SEC} seconds.`,
            )
            break
          }
          const sec = setVenueAnswerWindowSecondsPersist(vn, raw)
          await emitHostLibrary(vn)
          socket.emit(
            'toast',
            `Default trivia answer window for ${vn} is now ${sec}s (${ANSWER_WINDOW_MIN_SEC}–${ANSWER_WINDOW_MAX_SEC}).`,
          )
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'bet':
          const betAction = payload as BetAction
          gameState = placeBet(gameState, betAction.playerId, betAction.amount)
          io.to(sessionKey).emit('toast', `${betAction.playerId} bet $${betAction.amount}`)
          break
        case 'check':
          gameState = playerCheck(gameState, (payload as CheckAction).playerId)
          io.to(sessionKey).emit('toast', `Check`)
          break
        case 'call':
          gameState = playerCall(gameState, (payload as CallAction).playerId)
          io.to(sessionKey).emit('toast', `Call`)
          break
        case 'raise':
          gameState = playerRaise(gameState, (payload as RaiseAction).playerId, (payload as RaiseAction).amount)
          io.to(sessionKey).emit('toast', `Raise`)
          break
        case 'allIn':
          gameState = playerAllIn(gameState, (payload as AllInAction).playerId)
          io.to(sessionKey).emit('toast', `All-in!`)
          break
        case 'adminCloseBetting': {
          if (!assertVenueHost(socket, gameState)) break
          const lockClose = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'betting' && gs.round.isBettingOpen === true,
            'have wagering open on every felt so closing the street applies to the whole room together',
          )
          if (!lockClose) break
          for (const { tk } of lockClose) {
            let gs = rooms.get(tk)
            gs = adminCloseBetting(gs)
            gs = runVirtualPlayerSimulation(gs)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit('toast', 'Betting closed — entire venue in sync.')
          gameState = rooms.get(sessionKey)!
          break
        }
        case 'adminAdvanceTurn':
          if (!assertVenueHost(socket, gameState)) break
          gameState = adminAdvanceTurn(gameState)
          io.to(sessionKey).emit('toast', `Advanced to next player`)
          break
        case 'adminSetBlinds': {
          if (!assertVenueHost(socket, gameState)) break
          const { smallBlind, bigBlind } = payload as { smallBlind?: unknown; bigBlind?: unknown }
          const vn = normalizeVenueCode(gameState.code)
          setVenueBlindsPersist(vn, Number(smallBlind), Number(bigBlind))
          syncVenueBlindsToAllSessions(vn)
          for (const tk of allVenueSessionKeys(vn)) {
            const gs = rooms.get(tk)
            if (gs) emitVenueTableState(tk, gs)
          }
          await emitHostLibrary(vn)
          emitDisplayVenueSnapshotNow(vn)
          const snap = hostLibraryBlindsPayload(vn)
          socket.emit('toast', `Venue blinds synced: $${snap.smallBlind} / $${snap.bigBlind}`)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setVenueBlinds': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const sb = Number((payload as { smallBlind?: unknown })?.smallBlind)
          const bb = Number((payload as { bigBlind?: unknown })?.bigBlind)
          setVenueBlindsPersist(vn, sb, bb)
          syncVenueBlindsToAllSessions(vn)
          for (const tk of allVenueSessionKeys(vn)) {
            const gs = rooms.get(tk)
            if (gs) emitVenueTableState(tk, gs)
          }
          await emitHostLibrary(vn)
          emitDisplayVenueSnapshotNow(vn)
          const snap = hostLibraryBlindsPayload(vn)
          socket.emit('toast', `Venue blinds saved: $${snap.smallBlind} / $${snap.bigBlind}`)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setTableBlinds': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const tableNum = Math.floor(Number((payload as { tableNum?: unknown })?.tableNum))
          const sb = Number((payload as { smallBlind?: unknown })?.smallBlind)
          const bb = Number((payload as { bigBlind?: unknown })?.bigBlind)
          if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > VENUE_NUMBERED_TABLE_MAX) {
            socket.emit('toast', `Table number must be 1–${VENUE_NUMBERED_TABLE_MAX}.`)
            break
          }
          const tid = String(tableNum)
          const tk = tableSessionKey(vn, tid)
          const pair = setTableBlindsOverride(vn, tid, sb, bb)
          const gs = rooms.get(tk)
          if (gs) {
            const next = applyEffectiveBlindsToGameState(gs, vn, tk)
            rooms.set(tk, next)
            emitVenueTableState(tk, next)
          }
          emitDisplayVenueSnapshotNow(vn)
          socket.emit('toast', `Table ${tableNum} blinds: $${pair.smallBlind} / $${pair.bigBlind}`)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'clearTableBlinds': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const tableNum = Math.floor(Number((payload as { tableNum?: unknown })?.tableNum))
          if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > VENUE_NUMBERED_TABLE_MAX) {
            socket.emit('toast', `Table number must be 1–${VENUE_NUMBERED_TABLE_MAX}.`)
            break
          }
          const tid = String(tableNum)
          const tk = tableSessionKey(vn, tid)
          clearTableBlindsOverride(vn, tid)
          const gs = rooms.get(tk)
          if (gs) {
            const next = applyEffectiveBlindsToGameState(gs, vn, tk)
            rooms.set(tk, next)
            emitVenueTableState(tk, next)
          }
          emitDisplayVenueSnapshotNow(vn)
          const snap = hostLibraryBlindsPayload(vn)
          socket.emit('toast', `Table ${tableNum} reverted to venue blinds ($${snap.smallBlind} / $${snap.bigBlind})`)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setVenueBlindStructure': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const rawHands = Number((payload as { handsPerBlindLevel?: unknown })?.handsPerBlindLevel)
          const rawLevels = (payload as { levels?: unknown })?.levels
          let levels: { smallBlind: number; bigBlind: number }[] | undefined
          if (Array.isArray(rawLevels) && rawLevels.length > 0) {
            levels = rawLevels
              .map((l) => {
                if (l == null || typeof l !== 'object') return null
                const o = l as { smallBlind?: unknown; bigBlind?: unknown }
                return {
                  smallBlind: Number(o.smallBlind),
                  bigBlind: Number(o.bigBlind),
                }
              })
              .filter((x): x is { smallBlind: number; bigBlind: number } => x != null)
          }
          const snap = setVenueBlindStructurePersist(vn, rawHands, levels)
          syncVenueBlindsToAllSessions(vn)
          await emitHostLibrary(vn)
          emitDisplayVenueSnapshotNow(vn)
          socket.emit(
            'toast',
            `Blind structure: level every ${snap.handsPerBlindLevel} hand(s), ${snap.levels.length} levels, now $${snap.smallBlind}/$${snap.bigBlind}`,
          )
          gameState = rooms.get(sessionKey)!
          break
        }
          
        case 'fold':
          const foldAction = payload as FoldAction
          gameState = foldPlayer(gameState, foldAction.playerId)
          io.to(sessionKey).emit('toast', `${foldAction.playerId} folded`)
          break
          
        case 'submitAnswer': {
          const submitAnswerAction = payload as SubmitAnswerAction
          if (gameState.phase !== 'answering') {
            socket.emit('toast', 'Not accepting answers right now.')
            socket.emit('ack', { ok: false, message: 'Not accepting answers right now.' })
            break
          }
          const deadline = gameState.round.answerDeadline
          if (
            typeof deadline === 'number' &&
            Number.isFinite(deadline) &&
            Date.now() > deadline
          ) {
            socket.emit('toast', '⏱️ Too late! Answer window has closed.')
            socket.emit('ack', { ok: false, message: 'Answer window has closed.' })
            break
          }
          if (
            !isSubmittedAnswerComposableFromDeal(
              gameState,
              submitAnswerAction.playerId,
              submitAnswerAction.answer
            )
          ) {
            socket.emit(
              'toast',
              'That number cannot be built from your two hole cards and the five board cards (exactly five digit picks, optional decimal).'
            )
            socket.emit('ack', {
              ok: false,
              message: 'Answer is not constructible from the dealt digit cards.',
            })
            break
          }
          gameState = submitAnswer(
            gameState,
            submitAnswerAction.playerId,
            submitAnswerAction.answer,
            submitAnswerAction.composition
          )
          io.to(sessionKey).emit('toast', `Answer submitted: ${submitAnswerAction.answer}`)
          socket.emit('ack', { ok: true, message: 'Answer recorded.' })
          break
        }
          
        case 'revealAnswer': {
          if (!assertVenueHost(socket, gameState)) break
          const vnRev = normalizeVenueCode(gameState.code)
          const rowsRev = venuePlayableSnapshots(vnRev)
          if (rowsRev.length === 0) {
            socket.emit('toast', 'No playable tables yet — assign the lobby first.')
            break
          }
          const answeringRows = rowsRev.filter((r) => r.gs.phase === 'answering')
          if (answeringRows.length === 0) {
            const sample = rowsRev[0]!.gs
            socket.emit(
              'toast',
              `No table is in the answer window yet (yours collectively: ${humanReadableStrictState(sample)}). Wait for answering or use Host overrides.`,
            )
            break
          }
          const stragglers = rowsRev.filter((r) => r.gs.phase !== 'answering' && r.gs.phase !== 'showdown')
          if (stragglers.length > 0) {
            const nums = stragglers
              .map((r) => (Number.isFinite(r.n) ? String(r.n) : '?'))
              .sort()
              .join(', ')
            socket.emit(
              'toast',
              `Revealing on ${answeringRows.length} table(s) in answering — tables ${nums} are still catching up.`,
            )
          }
          for (const { tk } of answeringRows) {
            let gs = rooms.get(tk)
            if (!gs || gs.phase !== 'answering') continue
            gs = revealAnswer(gs)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit(
            'toast',
            stragglers.length === 0
              ? 'Answers revealed — every table at this venue.'
              : `Answers revealed on ${answeringRows.length} table(s).`,
          )
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'endRound': {
          if (!assertVenueHost(socket, gameState)) break
          const lockEnd = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'showdown',
            'bring every felt to showdown (reveal trivia) before paying / resetting the wave',
          )
          if (!lockEnd) break
          clearVenueWageringOrchestrationState(gameState.code)
          const vnEnd = normalizeVenueCode(gameState.code)
          const handResultRows: { tableNum: number; before: GameState; after: GameState }[] = []
          for (const { tk, n } of lockEnd) {
            const gs = rooms.get(tk)
            if (!gs) continue
            handResultRows.push({ tableNum: n, before: gs, after: endRound(gs) })
          }
          recordVenueHostHandResults(vnEnd, handResultRows)
          for (let i = 0; i < handResultRows.length; i++) {
            const tk = lockEnd[i]!.tk
            rooms.set(tk, handResultRows[i]!.after)
            emitVenueTableState(tk, handResultRows[i]!.after)
          }
          const levelMsg = recordVenueHandCompleted(vnEnd)
          syncVenueBlindsToAllSessions(vnEnd)
          await emitHostLibrary(vnEnd)
          const condenseToasts = runVenueCondenseAfterRound(vnEnd, gameState.hostId)
          emitDisplayVenueSnapshotNow(vnEnd)
          socket.emit('toast', `Round cleared — lobby on all ${lockEnd.length} felts at this venue.`)
          for (const msg of condenseToasts) {
            socket.emit('toast', msg)
            io.to(hostVenueRoom(vnEnd)).emit('toast', msg)
          }
          if (levelMsg) socket.emit('toast', levelMsg)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'newGame': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          clearVenueWageringOrchestrationState(vn)
          const hostIdSnap = gameState.hostId
          const lobbyKey = tableSessionKey(vn, LOBBY_TABLE_ID)
          for (const tk of allTableSessionsInVenue(vn)) {
            io.to(tk).emit('toast', 'Venue reset — use the lobby link to rejoin.')
            rooms.delete(tk)
          }
          const freshLobby = applyEffectiveBlindsToGameState(
            {
              ...createEmptyGame(vn, hostIdSnap, LOBBY_TABLE_ID),
              smallBlind: gameState.smallBlind,
              bigBlind: gameState.bigBlind,
            },
            vn,
            lobbyKey,
          )
          rooms.set(lobbyKey, freshLobby)
          const hostSock = io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            for (const r of [...hostSock.rooms]) {
              if (r === hostSock.id) continue
              if (typeof r === 'string' && r.startsWith(venueSessionKeyPrefix(vn))) {
                hostSock.leave(r)
              }
            }
            hostSock.join(lobbyKey)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = lobbyKey
          }
          emitVenueTableState(lobbyKey, freshLobby)
          socket.emit('toast', 'New game — numbered tables cleared; lobby reset.')
          venueAudienceWelcomeExpired.delete(vn)
          clearVenueHostLog(vn)
          emitDisplayVenueSnapshotNow(gameState.code)
          gameState = rooms.get(lobbyKey)!
          break
        }

        case 'assignTablesFromLobby': {
          if (!isLobbySessionKey(sessionKey)) {
            socket.emit(
              'toast',
              'Run “Assign” from the lobby session only (join host as table LOBBY).'
            )
            break
          }
          if (!assertVenueHost(socket, gameState)) break
          if (gameState.phase !== 'lobby') {
            socket.emit('toast', 'Assign only while still in lobby phase.')
            break
          }
          const lobbyKey = sessionKey
          const lobbyGs = rooms.get(lobbyKey)
          const roster = [...lobbyGs.players]
          if (roster.length === 0) {
            socket.emit('toast', 'No players in the lobby.')
            break
          }
          const hostIdSnap = lobbyGs.hostId
          const N = roster.length
          let tableCount = computeOptimalTableCount(N, lobbyGs.maxPlayers, lobbyGs.minPlayers)
          tableCount = Math.min(tableCount, VENUE_NUMBERED_TABLE_MAX)
          const sizes = splitIntoTableSizes(N, tableCount)
          const shuffled = shuffle(roster)
          let offset = 0
          for (let ti = 0; ti < tableCount; ti++) {
            const slice = shuffled.slice(offset, offset + sizes[ti])
            offset += sizes[ti]
            const tid = String(ti + 1)
            const tk = tableSessionKey(lobbyGs.code, tid)
            let gsNew = applyEffectiveBlindsToGameState(
              {
                ...createEmptyGame(lobbyGs.code, hostIdSnap, tid),
                smallBlind: lobbyGs.smallBlind,
                bigBlind: lobbyGs.bigBlind,
                players: slice,
              },
              lobbyGs.code,
              tk,
            )
            /** Humans expect lobby after assign until the host starts play — VP auto-run skips unless the table is CPU-only. */
            if (tableIsCpuOnly(gsNew)) {
              gsNew = runVirtualPlayerSimulation(gsNew)
            }
            rooms.set(tk, gsNew)
            for (const p of slice) {
              if (p.id.startsWith('vp:')) continue
              const sock = io.sockets.sockets.get(p.id)
              if (sock) {
                sock.leave(lobbyKey)
                sock.join(tk)
                ;(sock.data as { sessionKey?: string }).sessionKey = tk
                sock.emit('seated', { tableId: tid })
              }
            }
            emitVenueTableState(tk, gsNew)
          }

          const emptyLobby = applyEffectiveBlindsToGameState(
            {
              ...createEmptyGame(normalizeVenueCode(lobbyGs.code), hostIdSnap, LOBBY_TABLE_ID),
              smallBlind: lobbyGs.smallBlind,
              bigBlind: lobbyGs.bigBlind,
            },
            normalizeVenueCode(lobbyGs.code),
            lobbyKey,
          )
          rooms.set(lobbyKey, emptyLobby)
          io.to(lobbyKey).emit('state', emptyLobby)

          const t1Key = tableSessionKey(lobbyGs.code, '1')
          const hostSock = io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            hostSock.leave(lobbyKey)
            hostSock.join(t1Key)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = t1Key
          }

          socket.emit(
            'toast',
            `Seated ${N} players randomly across ${tableCount} tables (${sizes.join(', ')}). You are now on table 1.`
          )
          markVenueShowStarted(lobbyGs.code)
          gameState = rooms.get(t1Key)!
          break
        }

        case 'seedRehearsalVenue': {
          if (!isLobbySessionKey(sessionKey)) {
            socket.emit(
              'toast',
              'Run “Seed rehearsal” from the lobby session (join host as table LOBBY).',
            )
            break
          }
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const hostIdSnap = gameState.hostId
          const rawTableCount = Number((payload as { tableCount?: number })?.tableCount ?? VENUE_NUMBERED_TABLE_MAX)
          const tableCount = Number.isFinite(rawTableCount)
            ? Math.max(1, Math.min(VENUE_NUMBERED_TABLE_MAX, Math.floor(rawTableCount)))
            : VENUE_NUMBERED_TABLE_MAX
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
                smallBlind: gameState.smallBlind,
                bigBlind: gameState.bigBlind,
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
          const t1Key = tableSessionKey(vn, '1')
          const hostSock = io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            hostSock.leave(sessionKey)
            hostSock.join(t1Key)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = t1Key
          }
          markVenueShowStarted(vn)
          venueAudienceWelcomeExpired.add(vn)
          emitDisplayVenueSnapshotNow(vn)
          socket.emit(
            'toast',
            `Rehearsal: ${tableCount} tables, ${totalBots} CPUs (${sizes.join(', ')} per table). Host on table 1.`,
          )
          gameState = rooms.get(t1Key)!
          break
        }

        case 'addVirtualPlayers': {
          if (!assertVenueHost(socket, gameState)) break
          const raw = Number((payload as { count?: number })?.count ?? 2)
          const asked = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2
          gameState = spawnVirtualPlayers(gameState, asked)
          const nVirt = liveVirtualCount(gameState)
          io.to(sessionKey).emit('toast', `Test mode: added virtual seats (CPU total: ${nVirt}).`)
          break
        }

        case 'clearVirtualPlayers': {
          if (!assertVenueHost(socket, gameState)) break
          const cleared = liveVirtualCount(gameState)
          gameState = removeAllVirtualPlayers(gameState)
          io.to(sessionKey).emit(
            'toast',
            cleared > 0 ? `Removed ${cleared} virtual seat(s).` : 'No virtual seats to remove.'
          )
          break
        }

        case 'questionBankAdd': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const text = String(payload?.text ?? '').trim()
          const answer = Number(payload?.answer)
          if (!text || Number.isNaN(answer)) {
            socket.emit('toast', 'Question text and a numeric answer are required.')
            break
          }
          const id = `qb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
          const catRaw = payload?.category != null ? String(payload.category).trim() : ''
          const diff = Number(payload?.difficulty)
          const q: Question = {
            id,
            text,
            answer,
            category: catRaw.length > 0 ? catRaw : undefined,
            difficulty: Number.isFinite(diff) && diff >= 1 && diff <= 5 ? diff : undefined,
          }
          bank.push(q)
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question added.')
          break
        }

        case 'questionBankUpdate': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const id = String(payload?.id ?? '').trim()
          const idx = bank.findIndex((q) => q.id === id)
          if (idx < 0) {
            socket.emit('toast', 'Question not found.')
            break
          }
          const prev = bank[idx]
          const text =
            typeof payload?.text === 'string' ? payload.text.trim() : prev.text
          const ans =
            payload?.answer !== undefined ? Number(payload.answer) : prev.answer
          if (!text || Number.isNaN(ans)) {
            socket.emit('toast', 'Invalid text or answer.')
            break
          }
          let cat: string | undefined
          if (!('category' in (payload ?? {}))) {
            cat = prev.category
          } else if (payload?.category === null || payload?.category === '') {
            cat = undefined
          } else {
            const c = typeof payload.category === 'string' ? payload.category.trim() : ''
            cat = c.length > 0 ? c : undefined
          }
          let diff: number | undefined
          if (!('difficulty' in (payload ?? {}))) {
            diff = prev.difficulty
          } else if (payload?.difficulty === null) {
            diff = undefined
          } else {
            const d = Number(payload.difficulty)
            diff = Number.isFinite(d) && d >= 1 && d <= 5 ? d : undefined
          }
          bank[idx] = {
            ...prev,
            id: prev.id,
            text,
            answer: ans,
            category: cat,
            difficulty: diff,
          }
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question saved.')
          break
        }

        case 'questionBankDelete': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const id = String(payload?.id ?? '').trim()
          const filtered = bank.filter((q) => q.id !== id)
          if (filtered.length === bank.length) {
            socket.emit('toast', 'Question not found.')
            break
          }
          pruneIdFromAllSetlists(lib, id)
          lib.questions = filtered
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question removed.')
          break
        }

        case 'questionBankMove': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = [...lib.questions]
          const id = String(payload?.id ?? '').trim()
          const dir = payload?.direction === 'down' ? 'down' : 'up'
          const idx = bank.findIndex((q) => q.id === id)
          if (idx < 0) break
          const j = dir === 'up' ? idx - 1 : idx + 1
          if (j < 0 || j >= bank.length) break
          ;[bank[idx], bank[j]] = [bank[j], bank[idx]]
          lib.questions = bank
          await persistVenues()
          await emitHostLibrary(gameState.code)
          break
        }

        case 'questionBankImportRows': {
          if (!assertVenueHost(socket, gameState)) break
          const replace = !!payload?.replace
          const rows = payload?.rows
          if (!Array.isArray(rows) || rows.length === 0) {
            socket.emit('toast', 'Import payload must contain a rows array.')
            break
          }
          const venue = normalizeVenueCode(gameState.code)
          const validated = coerceImportQuestions(venue, rows)
          if (validated.length === 0) {
            socket.emit('toast', 'No valid rows (each needs text plus a numeric answer).')
            break
          }
          const lib = await ensureVenueLibrary(venue)
          if (replace) {
            lib.questions = validated
          } else {
            lib.questions = [...lib.questions, ...validated]
          }
          pruneSetlistRefs(lib)
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit(
            'toast',
            replace
              ? `Replaced bank with ${validated.length} question(s); setlists pruned to valid ids.`
              : `Appended ${validated.length} question(s).`
          )
          break
        }

        case 'questionBankResetSamples': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          lib.questions = STARTER_QUESTION_SET.map((q) => ({ ...q }))
          const starterIdx = lib.setlists.findIndex((s) => s.id === STARTER_SETLIST_ID)
          const starter = createStarterSetlist(STARTER_QUESTION_SET)
          if (starterIdx >= 0) {
            lib.setlists[starterIdx] = starter
          } else {
            lib.setlists.unshift(starter)
          }
          pruneSetlistRefs(lib)
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', `Starter pack restored (${STARTER_QUESTION_SET.length} questions).`)
          break
        }
          
        default:
          socket.emit('toast', 'Unknown action')
          return
      }
      
      if (!VENUE_SYNC_ACTION_TYPES.has(type)) {
        gameState = runVirtualPlayerSimulation(gameState)
        rooms.set(sessionKey, gameState)
        emitVenueTableState(sessionKey, gameState)
      }
      
    } catch (error) {
      console.error('Action error:', error)
      socket.emit('toast', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)

    clearDisplayPairingForSocket(socket.id)
    
    // Remove player from all rooms they were in
    socket.rooms.forEach(joinedRoom => {
      if (joinedRoom !== socket.id) {
        const gameState = rooms.get(joinedRoom)
        if (gameState) {
          // Find and remove the player
          let updatedState = removePlayer(gameState, socket.id)
          updatedState = runVirtualPlayerSimulation(updatedState)
          rooms.set(joinedRoom, updatedState)
          emitVenueTableState(joinedRoom, updatedState)
        }
      }
    })
  })
})

const PORT = Number(process.env.PORT) || 7777
const HOST = process.env.HOST ?? '0.0.0.0'
const publicOrigin =
  process.env.RAILWAY_PUBLIC_DOMAIN != null && process.env.RAILWAY_PUBLIC_DOMAIN !== ''
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null

async function bootstrap(): Promise<void> {
  venueLibraries = await loadVenueLibraries()
  const dbMode = process.env.DATABASE_URL?.trim() ? 'PostgreSQL (DATABASE_URL)' : 'SQLite file (VENUE_DATABASE_PATH or default under apps/server/data)'
  console.log(`📚 Venue libraries: ${dbMode}`)
  initAnswerWindowEnvDefault()
  loadVenueAnswerWindowSettingsFromDisk()
  loadVenueBlindSettingsFromDisk()
  console.log(
    '⏱️ Trivia answer window: default from ANSWER_WINDOW_SECONDS (see server); venue overrides in data/venue-answer-settings.json.',
  )
  console.log(
    '💰 Venue blinds: defaults 10/20 with level schedule; overrides in data/venue-blind-settings.json.',
  )

  httpServer.listen(PORT, HOST, () => {
    console.log(`🎰 Quizz\u2019em server running on ${HOST}:${PORT}`)
    console.log(`🌐 WebSocket server ready for connections`)
    const base = publicOrigin ?? `http://localhost:${PORT}`
    console.log(`📱 Host: ${base}/host`)
    console.log(`👤 Player: ${base}/player`)
    console.log(`📺 Display: ${base}/display`)
  })
}

bootstrap().catch((err) => {
  console.error('Fatal: failed to start server (venue library load):', err)
  process.exit(1)
})
