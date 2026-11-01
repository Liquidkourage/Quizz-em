/**
 * Physical chairs for a roster of `rosterCount` players on an 8-seat felt.
 * Seat 0 is 12 o'clock; indexes increase clockwise.
 * The result is the most evenly spaced subset, in clockwise order, so the
 * roster's turn order still walks around the table.
 */

function combinations(chairCount: number, take: number): number[][] {
  const out: number[][] = []
  const acc: number[] = []
  const walk = (start: number) => {
    if (acc.length === take) {
      out.push(acc.slice())
      return
    }
    for (let seat = start; seat < chairCount; seat++) {
      acc.push(seat)
      walk(seat + 1)
      acc.pop()
    }
  }
  walk(0)
  return out
}

function subsetBalance(seats: readonly number[], chairCount: number): { minGap: number; mag: number } {
  let minGap = chairCount
  if (seats.length > 1) {
    for (let i = 0; i < seats.length; i++) {
      const step = (seats[(i + 1) % seats.length]! - seats[i]! + chairCount) % chairCount
      if (step < minGap) minGap = step
    }
  }
  let x = 0
  let y = 0
  for (const seat of seats) {
    const t = (seat / chairCount) * Math.PI * 2
    x += Math.cos(t)
    y += Math.sin(t)
  }
  return { minGap, mag: Math.hypot(x, y) }
}

function isBetterBalance(next: number[], prev: number[], chairCount: number): boolean {
  const a = subsetBalance(next, chairCount)
  const b = subsetBalance(prev, chairCount)
  if (a.minGap !== b.minGap) return a.minGap > b.minGap
  return a.mag + 1e-6 < b.mag
}

export function balancedPhysicalSeats(rosterCount: number, chairCount = 8): number[] {
  const chairs = Math.max(1, Math.floor(chairCount))
  const n = Math.max(0, Math.floor(rosterCount))
  if (n <= 0) return []
  if (n >= chairs) return Array.from({ length: chairs }, (_, i) => i)
  let best: number[] | null = null
  for (const candidate of combinations(chairs, n)) {
    if (best == null || isBetterBalance(candidate, best, chairs)) best = candidate
  }
  return best ?? []
}
