import { describe, expect, it } from 'vitest'
import {
  introductionLine,
  introductionOrder,
  tableIntroduction,
  type IntroPlayer,
} from './tableIntroduction'

const table: IntroPlayer[] = [
  { id: 'a', name: 'Devon B.', bankroll: 980 },
  { id: 'b', name: 'test A.', bankroll: 990 },
  { id: 'c', name: 'Carla B.', bankroll: 980 },
  { id: 'me', name: 'Alice Chen', bankroll: 1000 },
  { id: 'e', name: 'Iris A.', bankroll: 980 },
  { id: 'f', name: 'Sam', bankroll: 980 },
]

describe('table introduction', () => {
  it('saves you for last and keeps the others in seat order', () => {
    const order = introductionOrder(tableIntroduction(table, 'me'))
    expect(order.map((plate) => plate.name)).toEqual([
      'Devon B.',
      'test A.',
      'Carla B.',
      'Iris A.',
      'Sam',
      'Alice C.',
    ])
    expect(order[order.length - 1]?.isYou).toBe(true)
    expect(order.slice(0, -1).every((plate) => !plate.isYou)).toBe(true)
    expect(order.slice(0, -1).map((plate) => plate.seat)).toEqual(
      [...order.slice(0, -1).map((plate) => plate.seat)].sort((a, b) => a - b),
    )
  })

  it('puts you at the bottom and the next seat on your left', () => {
    const plates = tableIntroduction(table, 'me')
    expect(plates.map((plate) => ({
      name: plate.name,
      seat: plate.seat,
      left: plate.leftPct,
      top: plate.topPct,
    }))).toEqual([
      { name: 'Devon B.', seat: 1, left: 50, top: 2 },
      { name: 'test A.', seat: 2, left: 91.6, top: 26 },
      { name: 'Carla B.', seat: 3, left: 91.6, top: 74 },
      { name: 'Alice C.', seat: 5, left: 50, top: 98 },
      { name: 'Iris A.', seat: 6, left: 8.4, top: 74 },
      { name: 'Sam', seat: 7, left: 8.4, top: 26 },
    ])

    const fromTheSide = tableIntroduction(table, 'b')
    const you = fromTheSide.find((plate) => plate.isYou)!
    const next = fromTheSide.find((plate) => plate.seat === 3)!
    expect(you).toMatchObject({ name: 'test A.', leftPct: 50, topPct: 98 })
    expect(next).toMatchObject({ name: 'Carla B.', leftPct: 8.4, topPct: 74 })
  })

  it('introduces the other seats in order when the plates arrive shuffled', () => {
    const plates = tableIntroduction(table, 'me')
    const shuffled = [plates[3]!, plates[5]!, plates[1]!, plates[4]!, plates[0]!, plates[2]!]
    expect(introductionOrder(shuffled).map((plate) => plate.seat)).toEqual([1, 2, 3, 6, 7, 5])
  })

  it('reads the arrival, then the whole table once everyone is in', () => {
    const you = introductionOrder(tableIntroduction(table, 'me')).at(-1)!
    expect(introductionLine(0, false, undefined)).toBe('Waiting for the host to deal')
    expect(introductionLine(6, false, you)).toBe(`Seat ${you.seat}, Alice C., $1000`)
    expect(introductionLine(6, true, you)).toBe('6 players. The host will deal when ready.')
    expect(introductionLine(1, true, you)).toBe('One player. The host will deal when ready.')
  })

  it('leaves a points-only player off the pre-deal table', () => {
    const plates = tableIntroduction(
      [...table, { id: 'ghost', name: 'Pat', bankroll: 0, pointsOnly: true }],
      'me',
    )
    expect(plates.map((plate) => plate.id)).not.toContain('ghost')
  })
})
