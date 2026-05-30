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

function sumWinnerChipPayouts(winners: readonly ShowdownResultRow[]): number {
  let sum = 0
  for (const r of winners) {
    if (typeof r.chipPayout === 'number' && Number.isFinite(r.chipPayout) && r.chipPayout > 0) {
      sum += Math.round(r.chipPayout)
    }
  }
  return sum
}

/**
 * Pot readout for floor showdown overlays. During showdown the engine `pot` field is often
 * already 0; use projected/awarded chip payouts from showdown rows when available.
 * Split pots show each winner's share, not the summed total (avoid implying full pot per winner).
 */
export function resolveShowdownDisplayPot(
  tile: DisplayVenueTileSnapshot,
  rows: readonly ShowdownResultRow[],
  labMode: boolean,
  correctAnswer: number | undefined
): number {
  const { winnerKeys } = sortShowdownRowsByDistance([...rows], correctAnswer)
  const winners = rows.filter(
    (r) =>
      winnerKeys.has(`${r.seat}:${r.name}`) &&
      r.name.trim() !== '' &&
      !r.hasFolded
  )
  const winnerCount = Math.max(1, winners.length)
  const isSplit = winners.length > 1

  const tilePot = Math.max(0, Math.floor(Number.isFinite(tile.pot) ? tile.pot : 0))
  const winnerPayoutSum = sumWinnerChipPayouts(winners)

  if (isSplit) {
    const payouts = winners
      .map((r) => r.chipPayout)
      .filter((p): p is number => typeof p === 'number' && p > 0)
    if (payouts.length > 0 && payouts.every((p) => p === payouts[0])) {
      return payouts[0]!
    }
    if (winnerPayoutSum > 0) return Math.round(winnerPayoutSum / winnerCount)
    if (tilePot > 0) return Math.round(tilePot / winnerCount)
    const fromTilePayouts = sumTileSeatChipPayouts(tile)
    if (fromTilePayouts > 0) return Math.round(fromTilePayouts / winnerCount)
    if (labMode) {
      const seated = Math.max(2, Math.floor(tile.seated) || 2)
      const total = 95 + tile.tableNum * 28 + seated * 12
      return Math.round(total / winnerCount)
    }
    return 0
  }

  if (tilePot > 0) return tilePot
  if (winnerPayoutSum > 0) return winnerPayoutSum

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
