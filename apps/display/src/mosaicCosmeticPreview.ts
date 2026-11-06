import {
  rehearsalSeatDisplayName,
  VENUE_NUMBERED_TABLE_MAX,
  VENUE_WALL_SEAT_SLOTS,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'

const COSMETIC_QUESTION = 'How many levels were included in the original Super Mario Bros.?'

function previewCount(tableCount: number): number {
  const n = Math.floor(tableCount)
  if (!Number.isInteger(n) || n < 1) return 1
  return Math.min(VENUE_NUMBERED_TABLE_MAX, n)
}

function seatNames(tableNum: number): string[] {
  return Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, seat) =>
    seat < 6 ? rehearsalSeatDisplayName((tableNum - 1) * VENUE_WALL_SEAT_SLOTS + seat) : '',
  )
}

function dealt(names: readonly string[]): boolean[] {
  return names.map((name) => name !== '')
}

function openBettingTile(tableNum: number): DisplayVenueTileSnapshot {
  const names = seatNames(tableNum)
  return {
    tableNum,
    seated: 6,
    pot: 1200,
    phase: 'betting',
    isBettingOpen: true,
    seatNames: names,
    seatInvested: [200, 200, 200, 200, 200, 200, 0, 0],
    seatFolded: [false, true, false, false, false, false, false, false],
    seatBankrolls: [800, 400, 600, 900, 700, 500, 0, 0],
    seatHolesDealt: dealt(names),
    actingSeatIndex: 0,
    actingCallAmount: 40,
    currentPlayerIndex: 0,
    smallBlind: 10,
    bigBlind: 20,
  }
}

function oneSideTile(tableNum: number): DisplayVenueTileSnapshot {
  const names = seatNames(tableNum)
  return {
    tableNum,
    seated: 6,
    pot: 6820,
    phase: 'betting',
    isBettingOpen: true,
    seatNames: names,
    seatInvested: [100, 1680, 1680, 1680, 1680, 0, 0, 0],
    seatFolded: [false, false, false, false, false, true, false, false],
    seatBankrolls: [0, 200, 200, 200, 200, 0, 0, 0],
    seatHolesDealt: dealt(names),
    actingSeatIndex: 1,
    actingCallAmount: 20,
    currentPlayerIndex: 1,
    smallBlind: 10,
    bigBlind: 20,
  }
}

function twoSideTile(tableNum: number): DisplayVenueTileSnapshot {
  const names = seatNames(tableNum)
  return {
    tableNum,
    seated: 6,
    pot: 9800,
    phase: 'betting',
    isBettingOpen: true,
    seatNames: names,
    seatInvested: [200, 800, 800, 4000, 4000, 0, 0, 0],
    seatFolded: [false, false, false, false, false, true, false, false],
    seatBankrolls: [0, 0, 0, 500, 500, 0, 0, 0],
    seatHolesDealt: dealt(names),
    actingSeatIndex: 3,
    actingCallAmount: 80,
    currentPlayerIndex: 3,
    smallBlind: 10,
    bigBlind: 20,
  }
}

function closedBettingTile(tableNum: number): DisplayVenueTileSnapshot {
  const names = seatNames(tableNum)
  return {
    tableNum,
    seated: 6,
    pot: 1200,
    phase: 'betting',
    isBettingOpen: false,
    seatNames: names,
    seatInvested: [200, 200, 200, 200, 200, 200, 0, 0],
    seatFolded: [false, true, false, false, false, false, false, false],
    seatBankrolls: [800, 400, 600, 900, 700, 500, 0, 0],
    seatHolesDealt: dealt(names),
    currentPlayerIndex: -1,
    smallBlind: 10,
    bigBlind: 20,
  }
}

function answeringTile(tableNum: number): DisplayVenueTileSnapshot {
  const names = seatNames(tableNum)
  return {
    tableNum,
    seated: 6,
    pot: 1200,
    phase: 'answering',
    isBettingOpen: false,
    seatNames: names,
    seatInvested: [200, 200, 200, 200, 200, 200, 0, 0],
    seatFolded: [false, false, false, false, false, false, false, false],
    seatBankrolls: [800, 400, 600, 900, 700, 500, 0, 0],
    seatHolesDealt: dealt(names),
    seatAnswerLocked: [true, false, true, true, false, false, false, false],
    communityDigits: [3, 2, 1],
    smallBlind: 10,
    bigBlind: 20,
  }
}

const TILE_HANDS = [openBettingTile, oneSideTile, twoSideTile, closedBettingTile, answeringTile] as const

/** Dev-server mosaic count from `?mosaic=`. Production never calls this. */
export function mosaicPreviewCountFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get('mosaic')
  if (raw == null || raw === '') return null
  const count = Number(raw)
  if (!Number.isInteger(count) || count < 1 || count > VENUE_NUMBERED_TABLE_MAX) return null
  return count
}

/** Fake venue wall. The live rooms are not read and not changed. */
export function mosaicCosmeticWall(tableCount: number): DisplayVenueWallSnapshot {
  const count = previewCount(tableCount)
  const tiles = Array.from({ length: count }, (_, index) => TILE_HANDS[index % TILE_HANDS.length]!(index + 1))
  return {
    tiles,
    headlineQuestionText: COSMETIC_QUESTION,
    answerDeadlineMs: null,
    headlinePhase: 'betting',
    venueLiveTableCount: count,
    lobbyPlayerCount: 0,
    totalSeatedAtTables: count * 6,
    showAudienceWelcome: false,
    venueSmallBlind: 10,
    venueBigBlind: 20,
  }
}
