import type { Server, Socket } from 'socket.io'

let ioRef: Server | null = null

const playerIdToSocketId = new Map<string, string>()
const socketIdToPlayerId = new Map<string, string>()

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
}

export function unregisterPlayerSocket(socketId: string): string | undefined {
  const playerId = socketIdToPlayerId.get(socketId)
  if (!playerId) return undefined
  socketIdToPlayerId.delete(socketId)
  if (playerIdToSocketId.get(playerId) === socketId) {
    playerIdToSocketId.delete(playerId)
  }
  return playerId
}

export function getSocketForPlayer(playerId: string): Socket | undefined {
  if (!playerId || playerId.startsWith('vp:')) return undefined
  const socketId = playerIdToSocketId.get(playerId)
  if (!socketId || !ioRef) return undefined
  return ioRef.sockets.sockets.get(socketId)
}

export function clearPlayerSocketRegistry(): void {
  playerIdToSocketId.clear()
  socketIdToPlayerId.clear()
}
