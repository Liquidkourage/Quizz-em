import { formatTriviaNumber } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'

export type FloorShowdownPresentation = {
  label: string
  winners: ShowdownResultRow[]
  guess: string | null
  winnerSeatIndexes: ReadonlySet<number>
  ariaLabel: string
}

export function buildFloorShowdownPresentation(
  rows: ShowdownResultRow[],
  correctAnswer: number | undefined
): FloorShowdownPresentation | null {
  const { winnerKeys } = sortShowdownRowsByDistance(rows, correctAnswer)
  const winners = rows.filter(
    (r) =>
      winnerKeys.has(`${r.seat}:${r.name}`) &&
      r.name.trim() !== '' &&
      !r.hasFolded
  )
  if (winners.length === 0) return null

  const chipRow = pickShowdownFloorChipRow(winners)
  const label = winners.length > 1 ? 'Split winners' : 'Winner'
  const guess =
    chipRow?.submitted != null && typeof correctAnswer === 'number'
      ? formatTriviaNumber(chipRow.submitted)
      : null

  const winnerSeatIndexes = new Set<number>()
  for (const w of winners) winnerSeatIndexes.add(w.seat - 1)

  return {
    label,
    winners,
    guess,
    winnerSeatIndexes,
    ariaLabel: `${label}: ${winners.map((w) => w.name).join(', ')}`,
  }
}

function sumPositiveChipPayouts(rows: readonly ShowdownResultRow[]): number {
  let sum = 0
  for (const r of rows) {
    if (typeof r.chipPayout === 'number' && Number.isFinite(r.chipPayout) && r.chipPayout > 0) {
      sum += Math.round(r.chipPayout)
    }
  }
  return sum
}

function sumTileSeatChipPayouts(tile: DisplayVenueTileSnapshot): number {
  const payouts = tile.seatChipPayout
  if (!Array.isArray(payouts)) return 0
  let sum = 0
  for (const p of payouts) {
    if (typeof p === 'number' && Number.isFinite(p) && p > 0) sum += Math.round(p)
  }
  return sum
}

/**
 * Pot readout for floor showdown overlays. During showdown the engine `pot` field is often
 * already 0; use projected/awarded chip payouts from showdown rows when available.
 */
export function resolveShowdownDisplayPot(
  tile: DisplayVenueTileSnapshot,
  rows: readonly ShowdownResultRow[],
  labMode: boolean
): number {
  const tilePot = Math.max(0, Math.floor(Number.isFinite(tile.pot) ? tile.pot : 0))
  if (tilePot > 0) return tilePot

  const fromRows = sumPositiveChipPayouts(rows)
  if (fromRows > 0) return fromRows

  const fromTilePayouts = sumTileSeatChipPayouts(tile)
  if (fromTilePayouts > 0) return fromTilePayouts

  if (labMode) {
    const seated = Math.max(2, Math.floor(tile.seated) || 2)
    return 95 + tile.tableNum * 28 + seated * 12
  }

  return 0
}
