import { describe, expect, it } from 'vitest'
import { roomCodeHint, roomCodeToApply, venueUrlWithRoom } from './hostVenueCode'

describe('host room code', () => {
  it('accepts a different code of letters and numbers', () => {
    expect(roomCodeToApply('HOST01', 'quiz')).toBe('QUIZ')
    expect(roomCodeToApply('HOST01', 'HOST01')).toBeNull()
    expect(roomCodeToApply('HOST01', ' host01 ')).toBeNull()
  })

  it('rejects a code players cannot type', () => {
    expect(roomCodeToApply('HOST01', 'A')).toBeNull()
    expect(roomCodeToApply('HOST01', 'QUIZ NIGHT')).toBeNull()
    expect(roomCodeToApply('HOST01', '')).toBeNull()
    expect(roomCodeHint('HOST01', 'A')).toBe('Use 2 to 12 letters or numbers.')
    expect(roomCodeHint('HOST01', 'HOST01')).toBeNull()
  })

  it('puts the room code on the host address so a refresh keeps it', () => {
    expect(venueUrlWithRoom('https://quizz-em.com/host/', 'QUIZ')).toBe(
      'https://quizz-em.com/host/?room=QUIZ',
    )
    expect(venueUrlWithRoom('https://quizz-em.com/host/?room=HOST01&table=1', 'FRIDAY')).toBe(
      'https://quizz-em.com/host/?room=FRIDAY&table=1',
    )
  })
})
