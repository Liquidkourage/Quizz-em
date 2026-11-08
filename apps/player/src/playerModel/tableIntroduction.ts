import { balancedPhysicalSeats } from '@qhe/core'
import { rosterDisplayName } from './seatBettingStatus'

export type IntroPlayer = {
  id: string
  name: string
  bankroll: number
  pointsOnly?: boolean
}

export type IntroPlate = {
  id: string
  seat: number
  name: string
  stack: number
  isYou: boolean
  leftPct: number
  topPct: number
}

/** You at the bottom. The next seat walks up the viewer's left. */
function platePoint(stepsFromYou: number, count: number): { leftPct: number; topPct: number } {
  const seats = Math.max(1, count)
  const angle = Math.PI / 2 + (stepsFromYou / seats) * Math.PI * 2
  const reach = 36
  return {
    leftPct: Math.round((50 + Math.cos(angle) * reach) * 10) / 10,
    topPct: Math.round((50 + Math.sin(angle) * reach) * 10) / 10,
  }
}

/** Plates for the pre-deal table. Seat numbers match the felt. You faces the bottom. */
export function tableIntroduction(
  players: readonly IntroPlayer[],
  heroId: string | undefined,
): IntroPlate[] {
  const seated = players.filter((player) => player.pointsOnly !== true)
  const chairs = balancedPhysicalSeats(seated.length)
  const plates = seated.map((player, index) => {
    const chair = chairs[index] ?? index
    return {
      id: player.id,
      seat: chair + 1,
      name: rosterDisplayName(player.name),
      stack: player.bankroll,
      isYou: player.id === heroId,
      leftPct: 50,
      topPct: 50,
    }
  })
  const start = Math.max(0, plates.findIndex((plate) => plate.isYou))
  return plates.map((plate, index) => {
    const steps = (index - start) % plates.length
    const point = platePoint(steps, plates.length)
    return { ...plate, leftPct: point.leftPct, topPct: point.topPct }
  })
}

/** Everyone else in seat order, then you, so the introduction ends on the player. */
export function introductionOrder(plates: readonly IntroPlate[]): IntroPlate[] {
  const others = plates.filter((plate) => !plate.isYou).sort((a, b) => a.seat - b.seat)
  const you = plates.find((plate) => plate.isYou)
  return you ? [...others, you] : others
}

/** The line under the table: the person just introduced, then the whole table. */
export function introductionLine(
  count: number,
  done: boolean,
  latest: Pick<IntroPlate, 'seat' | 'name' | 'stack'> | undefined,
): string {
  if (!done) {
    if (!latest) return 'Waiting for the host to deal'
    return `Seat ${latest.seat}, ${latest.name}, $${latest.stack}`
  }
  const players = count === 1 ? 'One player' : `${count} players`
  return `${players}. The host will deal when ready.`
}
