import { LOBBY_TABLE_ID } from '@qhe/core'

const STORAGE_KEY = 'qhe-player-join'

export type PlayerJoinPrefs = {
  playerName: string
  roomCode: string
  autoSeat: boolean
  tableId: string
}

export type PlayerJoinBootstrap = PlayerJoinPrefs & {
  roomFromUrl: boolean
  nameFromUrl: boolean
}

function readStoredPrefs(): Partial<PlayerJoinPrefs> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as Partial<PlayerJoinPrefs>
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

export function readPlayerJoinPrefs(): PlayerJoinBootstrap {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const stored = readStoredPrefs()
  const roomFromUrl = Boolean(params?.get('room')?.trim())
  const nameFromUrl = Boolean(params?.get('name')?.trim())
  const roomFromUrlValue = params?.get('room')?.trim().toUpperCase() ?? ''
  const nameFromUrlValue = params?.get('name')?.trim() ?? ''
  const manual = params?.get('manual') === 'true'
  const tableFromUrl = params?.get('table')?.trim() ?? ''

  return {
    playerName: nameFromUrlValue || stored.playerName || '',
    roomCode: roomFromUrlValue || stored.roomCode || '',
    autoSeat: manual ? false : stored.autoSeat !== false,
    tableId: tableFromUrl || stored.tableId || LOBBY_TABLE_ID,
    roomFromUrl,
    nameFromUrl,
  }
}

export function persistPlayerJoinPrefs(prefs: PlayerJoinPrefs): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        playerName: prefs.playerName,
        roomCode: prefs.roomCode,
        autoSeat: prefs.autoSeat,
        tableId: prefs.tableId,
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}
