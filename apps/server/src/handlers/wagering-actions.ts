import type { Socket } from 'socket.io'
import type { GameState, Question } from '@qhe/core'
import type {
  AllInAction,
  BetAction,
  CallAction,
  CheckAction,
  FoldAction,
  RaiseAction,
} from '@qhe/net'
import * as g from '../game-ops'
import { denyUnlessOwnSeat, foldIsLegalNow } from '../own-seat'

export async function handleWageringAction(
  socket: Socket,
  type: string,
  payload: any,
  sessionKey: string,
  gameStateIn: GameState,
): Promise<GameState | null> {
  let gameState = gameStateIn
  const holdBlocksWager = new Set([
    'bet',
    'check',
    'call',
    'raise',
    'fold',
    'allIn',
    'adminCloseBetting',
    'adminAdvanceTurn',
  ])
  if (holdBlocksWager.has(type) && g.isVenueHeld(gameState.code)) {
    socket.emit('toast', 'The room is on hold. Resume to continue.')
    return gameState
  }
  const seatActions = new Set(['bet', 'check', 'call', 'raise', 'fold', 'allIn'])
  if (seatActions.has(type)) {
    const playerId = payload?.playerId
    if (denyUnlessOwnSeat(socket, playerId)) return gameState
    if (type === 'fold' && !foldIsLegalNow(gameState, playerId)) {
      socket.emit('toast', 'Wait for your turn to fold.')
      socket.emit('ack', { ok: false, message: 'Wait for your turn to fold.' })
      return gameState
    }
  }
  switch (type) {
        case 'bet': {
          const betAction = payload as BetAction
          gameState = g.placeBet(gameState, betAction.playerId, betAction.amount)
          break
        }
        case 'check': {
          const checkAction = payload as CheckAction
          gameState = g.playerCheck(gameState, checkAction.playerId)
          break
        }
        case 'call': {
          const callAction = payload as CallAction
          gameState = g.playerCall(gameState, callAction.playerId)
          break
        }
        case 'raise': {
          const raiseAction = payload as RaiseAction
          gameState = g.playerRaise(gameState, raiseAction.playerId, raiseAction.amount)
          break
        }
        case 'allIn': {
          const allInAction = payload as AllInAction
          gameState = g.playerAllIn(gameState, allInAction.playerId)
          break
        }
        case 'adminCloseBetting': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockClose = g.requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'betting' && gs.round.isBettingOpen === true,
            'have wagering open on every felt so closing the street applies to the whole room together',
          )
          if (!lockClose) break
          for (const { tk } of lockClose) {
            let gs = g.rooms.get(tk)!
            gs = g.adminCloseBetting(gs)
            gs = g.runVirtualPlayerSimulation(gs)
            g.rooms.set(tk, gs)
            g.emitVenueTableState(tk, gs)
          }
          gameState = g.rooms.get(sessionKey)!
          break
        }
        case 'adminAdvanceTurn':
        case 'adminAdvanceTurnVenue': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vnAdv = g.normalizeVenueCode(gameState.code)
          const rowsAdv = g.venuePlayableSnapshots(vnAdv)
          let advanced = 0
          for (const { tk, gs } of rowsAdv) {
            if (gs.phase !== 'betting' || !gs.round.isBettingOpen) continue
            g.clearHumanTurnClock(tk)
            let next = g.adminAdvanceTurn(gs)
            next = g.runVirtualPlayerSimulation(next)
            g.rooms.set(tk, next)
            g.emitVenueTableState(tk, next)
            advanced++
          }
          socket.emit(
            'toast',
            advanced > 0
              ? `Folded the acting player on ${advanced} table(s).`
              : 'No open wagering to fold on any table.',
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'nudgeActingPlayers': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vnNudge = g.normalizeVenueCode(gameState.code)
          const requested = payload?.tableNum
          const tableNum =
            typeof requested === 'number' && Number.isFinite(requested) ? Math.floor(requested) : undefined
          const { nudged, names } = g.nudgeActingHumansVenue(vnNudge, tableNum)
          if (nudged === 0) {
            socket.emit(
              'toast',
              'No human is to act on an open wagering table — nothing to nudge.',
            )
          } else {
            const sample = names.slice(0, 4).join(', ')
            const more = names.length > 4 ? ` +${names.length - 4} more` : ''
            socket.emit(
              'toast',
              `Nudged ${nudged} player(s) — 30s then auto check/fold (${sample}${more}).`,
            )
          }
          gameState = g.rooms.get(sessionKey)!
          break
        }
        case 'adminSetBlinds': {
          if (!g.assertVenueHost(socket, gameState)) break
          const { smallBlind, bigBlind } = payload as { smallBlind?: unknown; bigBlind?: unknown }
          const vn = g.normalizeVenueCode(gameState.code)
          g.setVenueBlindsPersist(vn, Number(smallBlind), Number(bigBlind))
          g.syncVenueBlindsToAllSessions(vn)
          for (const tk of g.allVenueSessionKeys(vn)) {
            const gs = g.rooms.get(tk)
            if (gs) g.emitVenueTableState(tk, gs)
          }
          await g.emitHostLibrary(vn)
          g.emitDisplayVenueSnapshotNow(vn)
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'setVenueBlinds': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vn = g.normalizeVenueCode(gameState.code)
          const sb = Number((payload as { smallBlind?: unknown })?.smallBlind)
          const bb = Number((payload as { bigBlind?: unknown })?.bigBlind)
          g.setVenueBlindsPersist(vn, sb, bb)
          g.syncVenueBlindsToAllSessions(vn)
          for (const tk of g.allVenueSessionKeys(vn)) {
            const gs = g.rooms.get(tk)
            if (gs) g.emitVenueTableState(tk, gs)
          }
          await g.emitHostLibrary(vn)
          g.emitDisplayVenueSnapshotNow(vn)
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'setTableBlinds': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vn = g.normalizeVenueCode(gameState.code)
          const tableNum = Math.floor(Number((payload as { tableNum?: unknown })?.tableNum))
          const sb = Number((payload as { smallBlind?: unknown })?.smallBlind)
          const bb = Number((payload as { bigBlind?: unknown })?.bigBlind)
          if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > g.VENUE_NUMBERED_TABLE_MAX) {
            socket.emit('toast', `Table number must be 1–${g.VENUE_NUMBERED_TABLE_MAX}.`)
            break
          }
          const tid = String(tableNum)
          const tk = g.tableSessionKey(vn, tid)
          g.setTableBlindsOverride(vn, tid, sb, bb)
          const gs = g.rooms.get(tk)
          if (gs) {
            const next = g.applyEffectiveBlindsToGameState(gs, vn, tk)
            g.rooms.set(tk, next)
            g.emitVenueTableState(tk, next)
          }
          g.emitDisplayVenueSnapshotNow(vn)
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'clearTableBlinds': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vn = g.normalizeVenueCode(gameState.code)
          const tableNum = Math.floor(Number((payload as { tableNum?: unknown })?.tableNum))
          if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > g.VENUE_NUMBERED_TABLE_MAX) {
            socket.emit('toast', `Table number must be 1–${g.VENUE_NUMBERED_TABLE_MAX}.`)
            break
          }
          const tid = String(tableNum)
          const tk = g.tableSessionKey(vn, tid)
          g.clearTableBlindsOverride(vn, tid)
          const gs = g.rooms.get(tk)
          if (gs) {
            const next = g.applyEffectiveBlindsToGameState(gs, vn, tk)
            g.rooms.set(tk, next)
            g.emitVenueTableState(tk, next)
          }
          g.emitDisplayVenueSnapshotNow(vn)
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'setVenueBlindStructure': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vn = g.normalizeVenueCode(gameState.code)
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
          g.setVenueBlindStructurePersist(vn, rawHands, levels)
          g.syncVenueBlindsToAllSessions(vn)
          await g.emitHostLibrary(vn)
          g.emitDisplayVenueSnapshotNow(vn)
          gameState = g.rooms.get(sessionKey)!
          break
        }
          
        case 'fold': {
          const foldAction = payload as FoldAction
          gameState = g.foldPlayer(gameState, foldAction.playerId)
          break
        }
          
    default:
      return null
  }
  return gameState
}
