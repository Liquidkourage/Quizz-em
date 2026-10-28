import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { isHostWaitingForJoiners } from './hostDeskLayout'

export type HostMode = 'preshow' | 'live' | 'questions'

export const HOST_MODES: Array<{ id: HostMode; label: string; hint: string }> = [
  { id: 'preshow', label: 'Pre-show', hint: 'Pair TVs, wait for players, seat tables' },
  { id: 'live', label: 'Live', hint: 'One cue at a time while the hand runs' },
  { id: 'questions', label: 'Questions', hint: 'Question bank and setlists' },
]

/** Suggested mode from venue state (until the host picks a tab manually). */
export function suggestHostMode(
  gameState: GameState,
  venueFeltBeat: HostVenueFeltBeatRow[] | null,
): HostMode {
  const hasSeatedFelts =
    venueFeltBeat != null && venueFeltBeat.some((r) => r.active && r.seated > 0)
  if (hasSeatedFelts || (gameState.tableId ?? '') !== LOBBY_TABLE_ID) return 'live'
  if (isHostWaitingForJoiners(gameState)) return 'preshow'
  const inLobbyPool =
    gameState.phase === 'lobby' &&
    (gameState.tableId ?? '') === LOBBY_TABLE_ID &&
    gameState.players.length > 0
  if (inLobbyPool) return 'preshow'
  return 'preshow'
}
