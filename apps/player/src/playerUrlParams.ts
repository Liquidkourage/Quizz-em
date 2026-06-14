import { LOBBY_TABLE_ID } from '@qhe/core'

const STORAGE_KEY = 'qhe-player-join'

export type PlayerJoinPrefs = {
  playerName: string
  roomCode: string
  autoSeat: boolean
  tableId: string
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

export function readPlayerJoinPrefs(): PlayerJoinPrefs {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const stored = readStoredPrefs()
  const roomFromUrl = params?.get('room')?.trim().toUpperCase() ?? ''
  const nameFromUrl = params?.get('name')?.trim() ?? ''
  const manual = params?.get('manual') === 'true'
  const tableFromUrl = params?.get('table')?.trim() ?? ''

  return {
    playerName: nameFromUrl || stored.playerName || '',
    roomCode: roomFromUrl || stored.roomCode || '',
    autoSeat: manual ? false : stored.autoSeat !== false,
    tableId: tableFromUrl || stored.tableId || LOBBY_TABLE_ID,
  }
}

export function persistPlayerJoinPrefs(prefs: PlayerJoinPrefs): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota / private mode */
  }
}
