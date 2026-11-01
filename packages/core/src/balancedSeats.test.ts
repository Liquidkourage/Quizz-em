import { describe, expect, it } from 'vitest'
import { balancedPhysicalSeats } from './balancedSeats'

function minGap(seats: number[], chairs = 8): number {
  const sorted = [...seats].sort((a, b) => a - b)
  let gap = chairs
  for (let i = 0; i < sorted.length; i++) {
    const step = (sorted[(i + 1) % sorted.length]! - sorted[i]! + chairs) % chairs
    if (step < gap) gap = step
  }
  return gap
}

describe('balancedPhysicalSeats', () => {
  it('seats two players opposite each other', () => {
    expect(balancedPhysicalSeats(2)).toEqual([0, 4])
  })

  it('seats four players on every other chair', () => {
    expect(balancedPhysicalSeats(4)).toEqual([0, 2, 4, 6])
  })

  it('keeps a full table in chair order', () => {
    expect(balancedPhysicalSeats(8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('does not pack a short roster into the first chairs', () => {
    expect(balancedPhysicalSeats(3)).not.toEqual([0, 1, 2])
    expect(balancedPhysicalSeats(5)).not.toEqual([0, 1, 2, 3, 4])
    expect(balancedPhysicalSeats(6)).not.toEqual([0, 1, 2, 3, 4, 5])
    expect(minGap(balancedPhysicalSeats(3))).toBeGreaterThanOrEqual(2)
    expect(minGap(balancedPhysicalSeats(5))).toBeGreaterThanOrEqual(1)
    const six = balancedPhysicalSeats(6)
    const empty = [0, 1, 2, 3, 4, 5, 6, 7].filter((s) => !six.includes(s))
    expect(empty).toHaveLength(2)
    expect(Math.abs(empty[0]! - empty[1]!)).toBe(4)
  })
})
