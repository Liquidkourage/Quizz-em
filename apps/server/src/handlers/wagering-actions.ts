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
  switch (type) {
        case 'bet': {
          const betAction = payload as BetAction
          const who = g.toastPlayerLabel(gameState, betAction.playerId)
          gameState = g.placeBet(gameState, betAction.playerId, betAction.amount)
          g.io.to(sessionKey).emit('toast', `${who} bet $${betAction.amount.toLocaleString()}`)
          break
        }
        case 'check': {
          const checkAction = payload as CheckAction
          const who = g.toastPlayerLabel(gameState, checkAction.playerId)
          gameState = g.playerCheck(gameState, checkAction.playerId)
          g.io.to(sessionKey).emit('toast', `${who} checked`)
          break
        }
        case 'call': {
          const callAction = payload as CallAction
          const who = g.toastPlayerLabel(gameState, callAction.playerId)
          gameState = g.playerCall(gameState, callAction.playerId)
          g.io.to(sessionKey).emit('toast', `${who} called`)
          break
        }
        case 'raise': {
          const raiseAction = payload as RaiseAction
          const who = g.toastPlayerLabel(gameState, raiseAction.playerId)
          gameState = g.playerRaise(gameState, raiseAction.playerId, raiseAction.amount)
          g.io.to(sessionKey).emit(
            'toast',
            `${who} raised to $${raiseAction.amount.toLocaleString()}`,
          )
          break
        }
        case 'allIn': {
          const allInAction = payload as AllInAction
          const who = g.toastPlayerLabel(gameState, allInAction.playerId)
          gameState = g.playerAllIn(gameState, allInAction.playerId)
          g.io.to(sessionKey).emit('toast', `${who} is all-in!`)
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
          socket.emit('toast', 'Betting closed — entire venue in sync.')
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
              ? `Advanced wagering turn on ${advanced} table(s).`
              : 'No open wagering to advance on any table.',
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'nudgeActingPlayers': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vnNudge = g.normalizeVenueCode(gameState.code)
          const { nudged, names } = g.nudgeActingHumansVenue(vnNudge)
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
          const snap = g.hostLibraryBlindsPayload(vn)
          socket.emit('toast', `Venue blinds synced: $${snap.smallBlind} / $${snap.bigBlind}`)
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
          const snap = g.hostLibraryBlindsPayload(vn)
          socket.emit('toast', `Venue blinds saved: $${snap.smallBlind} / $${snap.bigBlind}`)
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
          const pair = g.setTableBlindsOverride(vn, tid, sb, bb)
          const gs = g.rooms.get(tk)
          if (gs) {
            const next = g.applyEffectiveBlindsToGameState(gs, vn, tk)
            g.rooms.set(tk, next)
            g.emitVenueTableState(tk, next)
          }
          g.emitDisplayVenueSnapshotNow(vn)
          socket.emit('toast', `Table ${tableNum} blinds: $${pair.smallBlind} / $${pair.bigBlind}`)
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
          const snap = g.hostLibraryBlindsPayload(vn)
          socket.emit('toast', `Table ${tableNum} reverted to venue blinds ($${snap.smallBlind} / $${snap.bigBlind})`)
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
          const snap = g.setVenueBlindStructurePersist(vn, rawHands, levels)
          g.syncVenueBlindsToAllSessions(vn)
          await g.emitHostLibrary(vn)
          g.emitDisplayVenueSnapshotNow(vn)
          socket.emit(
            'toast',
            `Blind structure: level every ${snap.handsPerBlindLevel} hand(s), ${snap.levels.length} levels, now $${snap.smallBlind}/$${snap.bigBlind}`,
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }
          
        case 'fold': {
          const foldAction = payload as FoldAction
          const who = g.toastPlayerLabel(gameState, foldAction.playerId)
          gameState = g.foldPlayer(gameState, foldAction.playerId)
          g.io.to(sessionKey).emit('toast', `${who} folded`)
          break
        }
          
    default:
      return null
  }
  return gameState
}
