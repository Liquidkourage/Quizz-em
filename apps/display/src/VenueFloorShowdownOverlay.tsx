import { shownTriviaNumber } from '@qhe/core'
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
  correctAnswer: number | undefined,
  question?: { text?: string | null; category?: string | null } | null,
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
      ? shownTriviaNumber(chipRow.submitted, question)
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

export type SplitWinnerShare = { name: string; amount: number }

/** Each split winner's chips. Unequal all-ins keep their own payout, including an uncalled return. */
export function splitWinnerPayouts(
  winners: readonly { name: string; chipPayout?: number | null }[],
  fallbackEach: number,
): SplitWinnerShare[] {
  const named = winners.filter((winner) => winner.name.trim() !== '')
  const known = named.every(
    (winner) =>
      typeof winner.chipPayout === 'number' && Number.isFinite(winner.chipPayout) && winner.chipPayout > 0,
  )
  if (named.length > 0 && known) {
    return named.map((winner) => ({ name: winner.name, amount: Math.round(winner.chipPayout!) }))
  }
  const each = Math.max(0, Math.round(fallbackEach))
  return named.map((winner) => ({ name: winner.name, amount: each }))
}

export function splitSharesMatch(shares: readonly SplitWinnerShare[]): boolean {
  if (shares.length === 0) return true
  const first = shares[0]!.amount
  return shares.every((share) => share.amount === first)
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

function evenSplitHeadline(
  winners: readonly ShowdownResultRow[],
  winnerCount: number,
  tilePot: number,
  tilePayouts: number,
): number {
  const shares = splitWinnerPayouts(winners, 0)
  if (shares.length > 0 && shares.every((share) => share.amount > 0)) {
    return splitSharesMatch(shares) ? shares[0]!.amount : 0
  }
  if (tilePot > 0) return Math.round(tilePot / winnerCount)
  if (tilePayouts > 0) return Math.round(tilePayouts / winnerCount)
  return 0
}

/**
 * Pot readout for floor showdown overlays. During showdown the engine `pot` field is often
 * already 0; use projected/awarded chip payouts from showdown rows when available.
 * Equal splits show one share. Unequal all-ins list each payout on the card instead.
 */
export function resolveShowdownDisplayPot(
  tile: DisplayVenueTileSnapshot,
  rows: readonly ShowdownResultRow[],
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

  if (isSplit) return evenSplitHeadline(winners, winnerCount, tilePot, sumTileSeatChipPayouts(tile))

  if (tilePot > 0) return tilePot
  if (winnerPayoutSum > 0) return winnerPayoutSum

  const fromRows = sumPositiveChipPayouts(rows)
  if (fromRows > 0) return fromRows

  const fromTilePayouts = sumTileSeatChipPayouts(tile)
  if (fromTilePayouts > 0) return fromTilePayouts

  return 0
}
