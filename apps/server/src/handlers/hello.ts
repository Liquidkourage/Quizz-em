import type { Socket } from 'socket.io'
import type { ClientHello, ServerAck } from '@qhe/net'
import * as g from '../game-ops'
import { hostHelloFailureMessage } from '../host-auth'
import { seatLatePointsOnlyPlayer } from '../late-entry'

function helloAckMessage(joinedLate: boolean, reconnected: boolean, tableId: string | undefined): string {
  if (joinedLate && tableId) return `You're in for points only, at table ${tableId}.`
  if (!reconnected) return 'Connected successfully'
  if (tableId && tableId !== g.LOBBY_TABLE_ID) return `Reconnected at table ${tableId}`
  return 'Reconnected to the venue'
}

function finishLateEntry(
  socket: Socket,
  role: string,
  alreadySeated: boolean,
  venueCode: string,
  playerId: string,
  name: string,
  accept: (session: NonNullable<ReturnType<typeof g.findPlayerSessionInVenue>>) => void,
): boolean {
  if (role !== 'player' || alreadySeated || !g.venueSeatsAreAssigned(venueCode)) return false
  const seated = seatLatePointsOnlyPlayer(venueCode, playerId, name)
  if (!seated.ok) {
    socket.emit('ack', { ok: false, message: seated.message })
    return true
  }
  const session = g.findPlayerSessionInVenue(venueCode, playerId)
  if (!session) {
    socket.emit('ack', { ok: false, message: 'Could not seat you for points.' })
    return true
  }
  accept(session)
  return false
}

export async function handleHello(socket: Socket, data: ClientHello) {
    const { role, name, roomCode } = data

    if (role === 'host') {
      const provided =
        typeof (data as { hostSecret?: string }).hostSecret === 'string'
          ? (data as { hostSecret: string }).hostSecret.trim()
          : ''
      const rejected = hostHelloFailureMessage(provided)
      if (rejected) {
        socket.emit('ack', { ok: false, message: rejected })
        socket.disconnect(true)
        return
      }
    }

    if (role === 'display' && data.displayAwaitPairing === true) {
      const sd = socket.data as g.DisplaySockData
      sd.role = 'display'
      sd.displayAwaitPairing = true
      sd.displayClientName = name
      g.clearDisplayPairingForSocket(socket.id)
      const code = g.assignDisplayPairing(socket)
      socket.emit('displayPairingCode', { code })
      socket.emit('ack', { ok: true, message: 'Await pairing from host.' })
      return
    }

    const venueCode = g.normalizeVenueCode(roomCode)
    const tableId = g.normalizeTableId(data.tableId)
    const playerIdRaw =
      role === 'player' && typeof data.playerId === 'string' ? data.playerId.trim() : ''
    const rosterPlayerId = role === 'player' ? playerIdRaw || `human:${socket.id}` : ''
    let playerReconnect =
      role === 'player' && playerIdRaw
        ? g.findPlayerSessionInVenue(venueCode, playerIdRaw)
        : null
    let joinedLate = false
    const helloSessionKey = g.tableSessionKey(venueCode, tableId)

    if (role !== 'display') {
      if (role === 'player' && !g.venueHasHost(venueCode)) {
        socket.emit('ack', {
          ok: false,
          message: 'No game found for that venue code. Check the code on the TV.',
        })
        return
      }

      /**
       * Once the show has started, a new phone joins for points and follows a chip player.
       * A stored playerId still reconnects to the seat they already have.
       */
      if (
        finishLateEntry(socket, role, playerReconnect != null, venueCode, rosterPlayerId, name, (session) => {
          playerReconnect = session
          joinedLate = true
        })
      ) {
        return
      }

      const candidateExists = !!g.rooms.get(helloSessionKey)
      if (
        !playerReconnect &&
        tableId !== g.LOBBY_TABLE_ID &&
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
      if (tableId !== g.LOBBY_TABLE_ID && role === 'host' && !candidateExists) {
        socket.emit('ack', {
          ok: false,
          message:
            'Host from LOBBY until tables exist. Connect with ?table=LOBBY (default) until after Assign from lobby.',
        })
        return
      }
    }

    const sockData = socket.data as g.DisplaySockData
    sockData.role = role
    sockData.venueCode = venueCode
    if (role === 'host') {
      sockData.hostAuthed = true
    }

    if (role === 'host') {
      socket.join(g.hostVenueRoom(venueCode))
      socket.emit('hostLibrary', await g.buildHostLibraryPayload(venueCode))
      g.emitHostDisplayRoster(venueCode)
      g.emitDisplayVenueSnapshotNow(venueCode)
    }

    if (role === 'display') {
      g.wireDisplaySocketToVenue(socket, venueCode, data)
      return
    }

    const activeSessionKey = playerReconnect?.sessionKey ?? helloSessionKey
    socket.join(activeSessionKey)
    sockData.sessionKey = activeSessionKey
    let emitKey = activeSessionKey

    let gameState = g.rooms.get(emitKey)
    if (!gameState) {
      gameState = g.applyEffectiveBlindsToGameState(
        g.createEmptyGame(venueCode, '', playerReconnect?.tableId ?? tableId),
        venueCode,
        emitKey,
      )
      g.rooms.set(emitKey, gameState)
    }

    if (role === 'host' && tableId === g.LOBBY_TABLE_ID) {
      const live = g.lowestSeatedTableInVenue(venueCode)
      if (live && live.sessionKey !== emitKey) {
        socket.leave(emitKey)
        socket.join(live.sessionKey)
        sockData.sessionKey = live.sessionKey
        emitKey = live.sessionKey
        gameState = g.rooms.get(emitKey) ?? gameState
        socket.emit('hostBoundTable', { tableId: live.tableId })
      }
    }

    if (role === 'host') {
      gameState = { ...gameState, hostId: socket.id }
      g.bindSocketAsVenueHost(socket, venueCode)
      if (g.resumeVenueAfterRestartIfHeld(venueCode)) {
        console.log(`[restart] host is back, resumed venue ${venueCode}`)
      }
      // Refresh local snapshot after venue-wide bind (may have rewritten this session).
      gameState = g.rooms.get(emitKey) ?? gameState
    }

    let restoredTableId: string | undefined
    if (role === 'player') {
      socket.join(g.playerVenueRoom(venueCode))
      if (playerReconnect) {
        sockData.viewerPlayerId = rosterPlayerId
        g.registerPlayerSocket(rosterPlayerId, socket.id)
        restoredTableId = playerReconnect.tableId
        if (restoredTableId !== g.LOBBY_TABLE_ID) {
          socket.emit('seated', { tableId: restoredTableId })
        }
      } else {
        const publicName = g.publicNameForNewPlayer(venueCode, name)
        gameState = g.addPlayer(gameState, rosterPlayerId, publicName)
        sockData.viewerPlayerId = rosterPlayerId
        g.registerPlayerSocket(rosterPlayerId, socket.id)
      }
    }

    g.rooms.set(emitKey, gameState)
    gameState = g.playVirtualPlayers(emitKey, gameState)

    const ack: ServerAck = {
      ok: true,
      message: helloAckMessage(joinedLate, playerReconnect != null, restoredTableId),
      ...(role === 'player' ? { playerId: rosterPlayerId } : {}),
      ...(restoredTableId && !joinedLate ? { restoredTableId } : {}),
    }
    socket.emit('ack', ack)

    g.emitVenueTableState(emitKey, gameState)
    if (role === 'player') {
      g.emitPlayerVenueBriefNow(venueCode)
    }
}
