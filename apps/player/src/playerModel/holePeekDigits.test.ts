import { describe, expect, it } from 'vitest'
import type { PlayerState } from '@qhe/core'
import { holePeekDigits } from './holePeekDigits'

const player = { hand: [{ digit: 7 }, { digit: 2 }] } as PlayerState

describe('hole peek digits', () => {
  it('returns the two hidden cards', () => {
    expect(holePeekDigits(player, 'betting')).toEqual([7, 2])
    expect(holePeekDigits(player, 'question')).toEqual([7, 2])
  })

  it('returns nothing without two cards or once the faces are public', () => {
    expect(holePeekDigits(undefined, 'betting')).toBeNull()
    expect(holePeekDigits({ ...player, hand: [] }, 'betting')).toBeNull()
    expect(holePeekDigits({ ...player, hand: [{ digit: 7 }] }, 'betting')).toBeNull()
    expect(holePeekDigits({ ...player, hand: [{ digit: 7 }, undefined] } as PlayerState, 'betting')).toBeNull()
    expect(holePeekDigits(player, 'reveal')).toBeNull()
    expect(holePeekDigits(player, 'showdown')).toBeNull()
  })
})
