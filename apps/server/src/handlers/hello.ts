import type { Socket } from 'socket.io'
import type { ClientHello, ServerAck } from '@qhe/net'
import * as g from '../game-ops'

export async function handleHello(socket: Socket, data: ClientHello) {
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
    const playerReconnect =
      role === 'player' && playerIdRaw
        ? g.findPlayerSessionInVenue(venueCode, playerIdRaw)
        : null
    const helloSessionKey = g.tableSessionKey(venueCode, tableId)
    const activeSessionKey = playerReconnect?.sessionKey ?? helloSessionKey

    if (role !== 'display') {
      if (role === 'player' && !g.venueHasHost(venueCode)) {
        socket.emit('ack', {
          ok: false,
          message: 'No game found for that venue code. Check the code on the TV.',
        })
        return
      }

      /**
       * Once the show has started (Assign / Start Game / first non-lobby felt),
       * reject brand-new players. Returning seats with a stored playerId still reconnect.
       */
      if (
        role === 'player' &&
        !playerReconnect &&
        g.venueAudienceWelcomeExpired.has(venueCode)
      ) {
        socket.emit('ack', {
          ok: false,
          message:
            'This game has already started — new players can’t join. If you were seated earlier, reopen the same join link on this phone to reconnect.',
        })
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
      g.emitDisplayVenueSnapshotNow(venueCode)
    }

    if (role === 'display') {
      g.wireDisplaySocketToVenue(socket, venueCode, data)
      return
    }

    socket.join(activeSessionKey)
    sockData.sessionKey = activeSessionKey

    let gameState = g.rooms.get(activeSessionKey)
    if (!gameState) {
      gameState = g.applyEffectiveBlindsToGameState(
        g.createEmptyGame(venueCode, '', playerReconnect?.tableId ?? tableId),
        venueCode,
        activeSessionKey,
      )
      g.rooms.set(activeSessionKey, gameState)
    }

    if (role === 'host') {
      gameState = { ...gameState, hostId: socket.id }
      g.bindSocketAsVenueHost(socket, venueCode)
      // Refresh local snapshot after venue-wide bind (may have rewritten this session).
      gameState = g.rooms.get(activeSessionKey) ?? gameState
    }

    let restoredTableId: string | undefined
    if (role === 'player') {
      socket.join(g.playerVenueRoom(venueCode))
      if (playerReconnect) {
        g.registerPlayerSocket(rosterPlayerId, socket.id)
        restoredTableId = playerReconnect.tableId
        if (restoredTableId !== g.LOBBY_TABLE_ID) {
          socket.emit('seated', { tableId: restoredTableId })
        }
      } else {
        if (g.isDisplayNameTaken(gameState, name)) {
          socket.emit('ack', {
            ok: false,
            message:
              'That name is already in the lobby. Use a unique name or reopen the join link on the same phone to reconnect.',
          })
          return
        }
        gameState = g.addPlayer(gameState, rosterPlayerId, name)
        g.registerPlayerSocket(rosterPlayerId, socket.id)
      }
    }

    gameState = g.runVirtualPlayerSimulation(gameState)
    g.rooms.set(activeSessionKey, gameState)

    const ack: ServerAck = {
      ok: true,
      message: playerReconnect
        ? restoredTableId && restoredTableId !== g.LOBBY_TABLE_ID
          ? `Reconnected at table ${restoredTableId}`
          : 'Reconnected to the venue'
        : 'Connected successfully',
      ...(role === 'player' ? { playerId: rosterPlayerId } : {}),
      ...(restoredTableId ? { restoredTableId } : {}),
    }
    socket.emit('ack', ack)

    g.emitVenueTableState(activeSessionKey, gameState)
    if (role === 'player') {
      g.emitPlayerVenueBriefNow(venueCode)
    }
}
