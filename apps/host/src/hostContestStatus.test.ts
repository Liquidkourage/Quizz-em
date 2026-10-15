import { describe, expect, it } from 'vitest'
import { hostContestReasonLabel, hostContestStatus } from './hostContestStatus'

describe('hostContestStatus', () => {
  it('marks live chip seats as in pot', () => {
    const s = hostContestStatus({ hasFolded: false, pointsOnly: false })
    expect(s.kind).toBe('pot')
    expect(s.label).toBe('In pot')
    expect(hostContestReasonLabel(s)).toBeNull()
  })

  it('marks folded seats as points only', () => {
    const s = hostContestStatus({ hasFolded: true, pointsOnly: false })
    expect(s.kind).toBe('points')
    expect(hostContestReasonLabel(s)).toBe('Folded')
  })

  it('marks busted seats as points only', () => {
    const s = hostContestStatus({ hasFolded: false, pointsOnly: true })
    expect(s.kind).toBe('points')
    expect(hostContestReasonLabel(s)).toBe('Busted')
  })
})
