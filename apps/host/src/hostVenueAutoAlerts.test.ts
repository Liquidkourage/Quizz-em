import { describe, expect, it } from 'vitest'
import {
  detectVenueAutoAlerts,
  hostVenueAutoAlertFromToast,
  type VenueFeltSnapshot,
} from './hostVenueAutoAlerts'

function snap(partial: Partial<VenueFeltSnapshot>): VenueFeltSnapshot {
  return {
    seatedCount: 1,
    round1OpenCount: 0,
    round2OpenCount: 0,
    round1AnyOpen: false,
    round2AnyOpen: false,
    answeringCount: 0,
    showdownCount: 0,
    lobbyCount: 0,
    unanimousAnswerDeadlineMs: null,
    ...partial,
  }
}

describe('host update banners', () => {
  it('stays quiet when the felt already shows the new phase', () => {
    expect(
      detectVenueAutoAlerts(snap({ round1AnyOpen: true, round1OpenCount: 1 }), snap({})),
    ).toEqual([{ kind: 'bets-closed', title: 'All bets are closed' }])
    expect(
      detectVenueAutoAlerts(
        snap({ round1AnyOpen: true }),
        snap({ round1AnyOpen: false, round2AnyOpen: true }),
      ),
    ).toEqual([])
    expect(
      detectVenueAutoAlerts(snap({ answeringCount: 0 }), snap({ answeringCount: 2 })),
    ).toEqual([])
    expect(hostVenueAutoAlertFromToast('Round 1 complete — board dealt on every table.')).toBeNull()
    expect(
      hostVenueAutoAlertFromToast('Answering opened — 8 table(s); 45s guide countdown (reveal when ready).'),
    ).toBeNull()
  })
})
