import type { Server, Socket } from 'socket.io'

let ioRef: Server | null = null

const playerIdToSocketId = new Map<string, string>()
const socketIdToPlayerId = new Map<string, string>()
const offlineSinceMs = new Map<string, number>()

export function initPlayerSocketRegistry(io: Server): void {
  ioRef = io
}

export function registerPlayerSocket(playerId: string, socketId: string): void {
  const prevSocket = playerIdToSocketId.get(playerId)
  if (prevSocket && prevSocket !== socketId) {
    socketIdToPlayerId.delete(prevSocket)
  }
  playerIdToSocketId.set(playerId, socketId)
  socketIdToPlayerId.set(socketId, playerId)
  offlineSinceMs.delete(playerId)
}

export function unregisterPlayerSocket(socketId: string): string | undefined {
  const playerId = socketIdToPlayerId.get(socketId)
  if (!playerId) return undefined
  socketIdToPlayerId.delete(socketId)
  if (playerIdToSocketId.get(playerId) === socketId) {
    playerIdToSocketId.delete(playerId)
  }
  if (!playerIdToSocketId.has(playerId)) offlineSinceMs.set(playerId, Date.now())
  return playerId
}

export function transferPlayerSocket(fromPlayerId: string, toPlayerId: string): string | undefined {
  const socketId = playerIdToSocketId.get(fromPlayerId)
  if (!socketId || fromPlayerId === toPlayerId) return undefined
  playerIdToSocketId.delete(fromPlayerId)
  registerPlayerSocket(toPlayerId, socketId)
  return socketId
}

export function playerIdForSocket(socketId: string): string | undefined {
  return socketIdToPlayerId.get(socketId)
}

export function getSocketForPlayer(playerId: string): Socket | undefined {
  if (!playerId || playerId.startsWith('vp:')) return undefined
  const socketId = playerIdToSocketId.get(playerId)
  if (!socketId || !ioRef) return undefined
  return ioRef.sockets.sockets.get(socketId)
}

export function playerOfflineSec(playerId: string, nowMs = Date.now()): number | null {
  const since = offlineSinceMs.get(playerId)
  if (since == null) return null
  return Math.max(0, Math.floor((nowMs - since) / 1000))
}

export function clearPlayerSocketRegistry(): void {
  playerIdToSocketId.clear()
  socketIdToPlayerId.clear()
  offlineSinceMs.clear()
}

/** Drop seat bindings for one venue. Other rooms on this process keep their phones. */
export function clearPlayerSocketsForIds(playerIds: Iterable<string>): void {
  for (const playerId of playerIds) {
    if (!playerId) continue
    const socketId = playerIdToSocketId.get(playerId)
    playerIdToSocketId.delete(playerId)
    if (socketId && socketIdToPlayerId.get(socketId) === playerId) {
      socketIdToPlayerId.delete(socketId)
    }
  }
}
