import { describe, expect, it } from 'vitest'
import { displayAddressWithRoom, displayVenueOnBoot, mintDisplayScreenCode } from './displaySession'

describe('displayVenueOnBoot', () => {
  it('resumes a paired TV from the saved venue after a refresh', () => {
    expect(displayVenueOnBoot(null, 'host01')).toBe('HOST01')
  })

  it('uses the room in the address when that link names an event', () => {
    expect(displayVenueOnBoot('other', 'HOST01')).toBe('OTHER')
  })

  it('waits for a pairing code when nothing is saved', () => {
    expect(displayVenueOnBoot(null, null)).toBeNull()
    expect(displayVenueOnBoot('  ', 'PAIRING')).toBeNull()
  })

  it('keeps a new room code in the public address', () => {
    expect(displayAddressWithRoom('https://quizz-em.com/display/?room=HOST01', 'quiz')).toBe(
      'https://quizz-em.com/display/?room=QUIZ',
    )
  })
})

describe('mintDisplayScreenCode', () => {
  it('builds a 4-character screen code the host can tell apart', () => {
    expect(mintDisplayScreenCode(() => 0)).toBe('AAAA')
  })
})
