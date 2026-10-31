import { describe, expect, it } from 'vitest'
import { playerSessionCanResume } from './playerUrlParams'

describe('playerSessionCanResume', () => {
  it('reconnects a phone that already joined', () => {
    expect(
      playerSessionCanResume({
        firstName: 'Ada',
        lastInitial: 'L',
        roomCode: 'HOST01',
        playerId: 'human:ada',
      }),
    ).toBe(true)
  })

  it('keeps a first visit on the name screen', () => {
    expect(
      playerSessionCanResume({
        firstName: '',
        lastInitial: '',
        roomCode: 'HOST01',
        playerId: 'human:new',
      }),
    ).toBe(false)
    expect(
      playerSessionCanResume({
        firstName: 'Ada',
        lastInitial: 'L',
        roomCode: '',
        playerId: 'human:ada',
      }),
    ).toBe(false)
  })
})
