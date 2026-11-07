export const DEAL_FLASH_MS = 3000

export type DealSnapshot = {
  roundId: string
  holeKey: string
  boardKey: string
}

export type DealFlash =
  | { kind: 'holes'; digits: readonly [number, number] }
  | { kind: 'street'; digits: readonly number[] }

type DealNow = DealSnapshot & {
  holeDigits: readonly number[]
  boardDigits: readonly number[]
}

/**
 * Popup when the board newly appears. Hole cards stay behind the peek.
 * The first snapshot is a reconnect, not a deal.
 */
export function nextDealFlash(prev: DealSnapshot | null, next: DealNow): DealFlash | null {
  if (prev == null) return null
  const streetArrived = next.boardDigits.length > 0 && next.boardKey.length > 0 && next.boardKey !== prev.boardKey
  if (streetArrived) return { kind: 'street', digits: next.boardDigits }
  return null
}
