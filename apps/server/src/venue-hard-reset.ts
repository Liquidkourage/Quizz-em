import { PLAYER_NEW_GAME_MESSAGE } from '@qhe/net'

type PhoneSocket = {
  emit: (event: 'eventLeft', payload: { message: string }) => void
}

/** Tell every phone the hard reset ended the session, including seats that left the player room. */
export function releasePhonesOnHardReset(deps: {
  playerIds: readonly string[]
  sessionKeys: readonly string[]
  playerVenueRoom: string
  socketForPlayer: (playerId: string) => PhoneSocket | undefined
  emitToRoom: (room: string, event: 'eventLeft', payload: { message: string }) => void
}): void {
  const payload = { message: PLAYER_NEW_GAME_MESSAGE }
  for (const playerId of deps.playerIds) {
    deps.socketForPlayer(playerId)?.emit('eventLeft', payload)
  }
  const rooms = new Set<string>([deps.playerVenueRoom, ...deps.sessionKeys])
  for (const room of rooms) {
    if (room.length === 0) continue
    deps.emitToRoom(room, 'eventLeft', payload)
  }
}
