import type { Socket } from 'socket.io'
import type { GameState } from '@qhe/core'
import type { ClientHello } from '@qhe/net'
import * as g from '../game-ops'

/** syncState, display heartbeat, layout, and TV pairing — before a table session is required. */
export async function handleDisplayTransport(
  socket: Socket,
  type: string,
  payload: any,
): Promise<boolean> {
    /**
     * Lockstep heal: re-push this client's authoritative snapshots after reconnect
     * or periodic keepalive (GoT sync-state pattern).
     */
    if (type === 'syncState') {
      const sockData = socket.data as g.DisplaySockData
      const vn = g.resolveVenueCodeForSocket(socket)
      if (!vn) return true

      const sessionKey = g.getActiveSessionKey(socket)
      if (sessionKey) {
        const gs = g.rooms.get(sessionKey) as GameState | undefined
        if (gs) {
          const turnDeadlineMs = g.syncHumanTurnDeadline(sessionKey, gs)
          socket.emit('state', {
            ...gs,
            serverNowMs: Date.now(),
            playerOnline: g.buildPlayerOnlineMap(gs),
            round: { ...gs.round, turnDeadlineMs },
          })
        }
      }

      if (sockData.role === 'display') {
        const layout = g.venueDisplayLayouts.get(vn)
        if (layout) socket.emit('displayLayout', layout)
        g.emitDisplayVenueSnapshotNow(vn)
      } else if (sockData.role === 'host') {
        g.emitDisplayVenueSnapshotNow(vn)
        socket.emit('hostLibrary', await g.buildHostLibraryPayload(vn))
      } else if (sockData.role === 'player') {
        g.emitPlayerVenueBriefNow(vn)
      }
      return true
    }

    if (type === 'displayHeartbeat') {
      const sockData = socket.data as g.DisplaySockData
      if (sockData.role !== 'display') return true
      const vn = g.resolveVenueCodeForSocket(socket)
      if (!vn) return true
      let bySock = g.displayHeartbeatByVenue.get(vn)
      if (!bySock) {
        bySock = new Map()
        g.displayHeartbeatByVenue.set(vn, bySock)
      }
      bySock.set(socket.id, Date.now())
      return true
    }

    if (type === 'displaySetLayout') {
      const sessionKey = g.getActiveSessionKey(socket)
      if (!sessionKey) {
        socket.emit('toast', 'No room found')
        return true
      }
      const gsCtl = g.rooms.get(sessionKey)
      if (!gsCtl) {
        socket.emit('toast', 'Game not found')
        return true
      }
      if (!g.assertVenueHost(socket, gsCtl)) {
        return true
      }
      const nextLayout = g.parseDisplaySetLayoutPayload(payload)
      if (!nextLayout) {
        socket.emit(
          'toast',
          `Invalid TV layout (send venue wall + optional focus table 1–${g.VENUE_NUMBERED_TABLE_MAX}).`,
        )
        return true
      }
      g.venueDisplayLayouts.set(g.normalizeVenueCode(gsCtl.code), nextLayout)
      g.io.to(g.displayVenueRoom(gsCtl.code)).emit('displayLayout', nextLayout)
      g.emitDisplayVenueSnapshotNow(gsCtl.code)
      socket.emit('toast', 'TV / display layout updated for the venue.')
      return true
    }

    if (type === 'pairDisplayWithHost') {
      const sessionKey = g.getActiveSessionKey(socket)
      if (!sessionKey) {
        socket.emit('toast', 'No room found')
        return true
      }
      const gsCtl = g.rooms.get(sessionKey)
      if (!gsCtl) {
        socket.emit('toast', 'Game not found')
        return true
      }
      if (!g.assertVenueHost(socket, gsCtl)) {
        return true
      }
      const raw = typeof payload?.code === 'string' ? payload.code : ''
      const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (code.length !== 4) {
        socket.emit('toast', 'Enter the 4-character code from the TV.')
        socket.emit('ack', { ok: false, message: 'Invalid code length' })
        return true
      }
      const pend = g.displayPairByCode.get(code)
      if (!pend) {
        socket.emit('toast', 'No display is waiting with that code.')
        socket.emit('ack', { ok: false, message: 'Unknown code' })
        return true
      }
      const dSock = g.io.sockets.sockets.get(pend.socketId)
      if (!dSock) {
        g.displayPairByCode.delete(code)
        g.displayPairCodeBySocketId.delete(pend.socketId)
        socket.emit('toast', 'That display went offline. Refresh the TV to get a new code.')
        socket.emit('ack', { ok: false, message: 'Display offline' })
        return true
      }
      const dsd = dSock.data as g.DisplaySockData
      if (!dsd.displayAwaitPairing) {
        socket.emit('toast', 'That code was already used.')
        socket.emit('ack', { ok: false, message: 'Code consumed' })
        return true
      }

      g.clearDisplayPairingForSocket(pend.socketId)

      const vn = g.normalizeVenueCode(gsCtl.code)
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

      g.wireDisplaySocketToVenue(dSock, vn, bindHello)
      dSock.emit('displayVenueAssigned', { venueCode: vn })

      socket.emit('ack', { ok: true, message: 'Display paired.' })
      socket.emit('toast', 'TV paired — it should join this venue now.')
      return true
    }
  return false
}
