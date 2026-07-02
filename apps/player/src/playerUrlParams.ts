import { LOBBY_TABLE_ID } from '@qhe/core'
import { composePlayerDisplayName, parsePlayerDisplayName } from './playerJoinName'

const STORAGE_KEY = 'qhe-player-join'

export type PlayerJoinPrefs = {
  firstName: string
  lastInitial: string
  roomCode: string
  autoSeat: boolean
  tableId: string
}

export type PlayerJoinBootstrap = PlayerJoinPrefs & {
  roomFromUrl: boolean
  nameFromUrl: boolean
}

function readStoredPrefs(): Partial<PlayerJoinPrefs & { playerName?: string }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as Partial<PlayerJoinPrefs & { playerName?: string }>
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function resolveNameFields(
  stored: Partial<PlayerJoinPrefs & { playerName?: string }>,
  nameFromUrlValue: string
): Pick<PlayerJoinPrefs, 'firstName' | 'lastInitial'> {
  if (nameFromUrlValue.trim()) {
    return parsePlayerDisplayName(nameFromUrlValue)
  }
  if (stored.firstName != null || stored.lastInitial != null) {
    return {
      firstName: stored.firstName ?? '',
      lastInitial: stored.lastInitial ?? '',
    }
  }
  if (typeof stored.playerName === 'string' && stored.playerName.trim()) {
    return parsePlayerDisplayName(stored.playerName)
  }
  return { firstName: '', lastInitial: '' }
}

export function playerDisplayNameFromPrefs(prefs: Pick<PlayerJoinPrefs, 'firstName' | 'lastInitial'>): string {
  return composePlayerDisplayName(prefs.firstName, prefs.lastInitial)
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
  const { firstName, lastInitial } = resolveNameFields(stored, nameFromUrlValue)

  return {
    firstName,
    lastInitial,
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
        firstName: prefs.firstName,
        lastInitial: prefs.lastInitial,
        roomCode: prefs.roomCode,
        autoSeat: prefs.autoSeat,
        tableId: prefs.tableId,
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}
