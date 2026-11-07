import { describe, expect, it } from 'vitest'
import { DEAL_FLASH_MS, nextDealFlash, type DealSnapshot } from './dealFlash'

const seen: DealSnapshot = { roundId: 'r1', holeKey: '', boardKey: '' }

describe('nextDealFlash', () => {
  it('stays quiet on the first snapshot so a reconnect does not pop the cards', () => {
    expect(
      nextDealFlash(null, {
        roundId: 'r1',
        holeKey: '4,1',
        boardKey: '',
        holeDigits: [4, 1],
        boardDigits: [],
      }),
    ).toBeNull()
  })

  it('leaves a new hole pair for the peek instead of popping it', () => {
    expect(
      nextDealFlash(seen, {
        roundId: 'r1',
        holeKey: '4,1',
        boardKey: '',
        holeDigits: [4, 1],
        boardDigits: [],
      }),
    ).toBeNull()
  })

  it('pops the board when the street is dealt', () => {
    expect(
      nextDealFlash(
        { roundId: 'r1', holeKey: '4,1', boardKey: '' },
        {
          roundId: 'r1',
          holeKey: '4,1',
          boardKey: '8,0,2,6,3',
          holeDigits: [4, 1],
          boardDigits: [8, 0, 2, 6, 3],
        },
      ),
    ).toEqual({ kind: 'street', digits: [8, 0, 2, 6, 3] })
  })

  it('does not pop again for the same cards', () => {
    const now = {
      roundId: 'r1',
      holeKey: '4,1',
      boardKey: '8,0,2,6,3',
      holeDigits: [4, 1],
      boardDigits: [8, 0, 2, 6, 3],
    }
    expect(nextDealFlash({ roundId: 'r1', holeKey: '4,1', boardKey: '8,0,2,6,3' }, now)).toBeNull()
  })

  it('leaves the next hand’s hole cards for the peek', () => {
    expect(
      nextDealFlash(
        { roundId: 'r1', holeKey: '4,1', boardKey: '' },
        {
          roundId: 'r2',
          holeKey: '9,2',
          boardKey: '',
          holeDigits: [9, 2],
          boardDigits: [],
        },
      ),
    ).toBeNull()
  })

  it('holds the popup for 3 seconds', () => {
    expect(DEAL_FLASH_MS).toBe(3000)
  })
})
