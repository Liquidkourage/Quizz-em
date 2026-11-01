const LADDER: ReadonlyArray<readonly [number, number]> = [
  [10, 20],
  [15, 30],
  [20, 40],
  [25, 50],
  [40, 80],
  [50, 100],
  [75, 150],
  [100, 200],
  [150, 300],
  [200, 400],
  [300, 600],
  [400, 800],
]

const HOST_SEC = 45
const STREET_FACTOR = 1.65
function closeEnough(gap: number, depthNow: number): boolean {
  const abs = Math.abs(gap)
  if (abs <= 8) return true
  return abs <= 9 && depthNow >= 12
}

export type BlindCallVerb = 'Hold' | 'Speed up' | 'Slow down' | 'Cut the guide' | 'Stretch the guide'

export type BlindCallInput = {
  minutesLeft: number
  handsLeft: number
  players: number
  startedWith: number
  medianStack: number
  bigBlind: number
  handsPerLevel: number
  guideSec: number
  paceSec?: number
}

export type BlindCall = {
  verb: BlindCallVerb
  smallBlind: number
  bigBlind: number
  handsPerLevel: number
  guideSec: number
  minutesIfUnchanged: number
  minutesIfTaken: number
  depthNowBb: number
  depthNextBb: number
}

type Move = {
  idx: number
  every: number
  pred: number
  depth: number
  score: number
}

type Room = {
  minutes: number
  hands: number
  players: number
  started: number
  stack: number
  pace: number
  guide: number
  cur: number
  every: number
  depthNow: number
  faster: boolean
}

function seatedStack(name: string | undefined, roll: number | undefined): number | null {
  if (!name?.trim()) return null
  if (typeof roll !== 'number' || !Number.isFinite(roll) || roll < 0) return null
  return roll
}

function medianOf(stacks: number[]): number | null {
  if (stacks.length === 0) return null
  const sorted = [...stacks].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]!
  return (sorted[mid - 1]! + sorted[mid]!) / 2
}

export function medianSeatedStack(
  tiles: readonly { seatNames?: readonly string[]; seatBankrolls?: readonly number[] }[],
): number | null {
  const stacks: number[] = []
  for (const tile of tiles) {
    const names = tile.seatNames ?? []
    const rolls = tile.seatBankrolls ?? []
    for (let i = 0; i < names.length; i++) {
      const stack = seatedStack(names[i], rolls[i])
      if (stack != null) stacks.push(stack)
    }
  }
  return medianOf(stacks)
}

function rungIndex(bb: number): number {
  let best = 0
  let dist = Infinity
  for (let i = 0; i < LADDER.length; i++) {
    const d = Math.abs(Math.log(LADDER[i]![1]) - Math.log(Math.max(1, bb)))
    if (d < dist) {
      dist = d
      best = i
    }
  }
  return best
}

function roomSeats(players: number): number {
  const minTables = Math.max(1, Math.ceil(players / 8))
  const maxTables = Math.max(minTables, Math.min(20, Math.floor(players / 2)))
  const tables = Math.min(maxTables, Math.max(minTables, Math.round(players / 6) || 1))
  return Math.min(8, Math.max(2, Math.ceil(players / tables)))
}

function actorFromDepth(depth: number): number {
  const t = Math.min(1, Math.max(0, depth / 40))
  return 0.62 + 0.38 * t
}

function averageDepth(stack: number, start: number, hands: number, every: number): number {
  let idx = start
  let at = 0
  let sum = 0
  const n = Math.max(1, hands)
  for (let h = 0; h < n; h++) {
    sum += stack / LADDER[idx]![1]
    at += 1
    if (at >= every && idx < LADDER.length - 1) {
      idx += 1
      at = 0
    }
  }
  return sum / n
}

function predictMinutes(hands: number, players: number, pace: number, depth: number, guide: number): number {
  const betting = roomSeats(players) * pace * STREET_FACTOR * actorFromDepth(depth)
  return (hands * (HOST_SEC + guide + betting)) / 60
}

function roundGuide(seconds: number): number {
  const n = Number(seconds)
  if (!Number.isFinite(n)) return 45
  return Math.min(300, Math.max(15, Math.round(n / 15) * 15))
}

function guideFor(room: Room, depth: number): number {
  const betting = roomSeats(room.players) * room.pace * STREET_FACTOR * actorFromDepth(depth)
  const raw = (room.minutes * 60) / room.hands - HOST_SEC - betting
  return roundGuide(raw)
}

function pack(pair: readonly [number, number], every: number, guide: number, nowMin: number, nextMin: number, depthNow: number, depthNext: number, verb: BlindCallVerb): BlindCall {
  return {
    verb,
    smallBlind: pair[0],
    bigBlind: pair[1],
    handsPerLevel: every,
    guideSec: guide,
    minutesIfUnchanged: nowMin,
    minutesIfTaken: nextMin,
    depthNowBb: depthNow,
    depthNextBb: depthNext,
  }
}

function blindChangeBlocked(room: Room): boolean {
  const ratio = room.players / room.started
  if (room.faster && room.depthNow < 12) return true
  if (room.faster && ratio <= 0.5 && room.depthNow < 18) return true
  if (!room.faster && room.depthNow >= 35 && ratio > 0.8) return true
  return false
}

function cadenceChoices(every: number, faster: boolean): number[] {
  const cur = Math.min(8, Math.max(2, Math.floor(every)))
  const raw = faster ? [cur, Math.max(2, cur - 1), 2, 3] : [cur, Math.min(8, cur + 1), 4, 5]
  const picked = raw.filter((n) => n >= 2 && n <= 8 && (faster ? n <= cur : n >= cur))
  return [...new Set(picked)]
}

function moveScore(pred: number, minutes: number, jump: number, cadence: number, faster: boolean, depth: number): number {
  const err = Math.abs(pred - minutes)
  const miss = err <= 8 ? 0 : 16
  const tooShort = faster && depth < 10 ? (10 - depth) * 8 : 0
  return err * 4 + miss + jump * 3 + cadence + tooShort
}

function keepMove(faster: boolean, depth: number, depthNow: number): boolean {
  if (!faster) return true
  if (depth >= 10) return true
  return depthNow < 12
}

function listMoves(room: Room): Move[] {
  const blocked = blindChangeBlocked(room)
  const everys = cadenceChoices(room.every, room.faster)
  const indexes = room.faster
    ? Array.from({ length: LADDER.length - room.cur }, (_, i) => room.cur + i)
    : Array.from({ length: room.cur + 1 }, (_, i) => room.cur - i)
  const pool: Move[] = []
  for (const idx of indexes) {
    if (blocked && idx !== room.cur) continue
    for (const every of everys) {
      if (idx === room.cur && every === room.every) continue
      const depth = averageDepth(room.stack, idx, room.hands, every)
      const pred = predictMinutes(room.hands, room.players, room.pace, depth, room.guide)
      pool.push({
        idx,
        every,
        pred,
        depth,
        score: moveScore(pred, room.minutes, Math.abs(idx - room.cur), Math.abs(every - room.every), room.faster, depth),
      })
    }
  }
  const safe = pool.filter((move) => keepMove(room.faster, move.depth, room.depthNow))
  const source = safe.length > 0 ? safe : pool
  source.sort((a, b) => a.score - b.score)
  return source
}

function verbFor(faster: boolean, sameStructure: boolean, guide: number, guideNow: number): BlindCallVerb {
  if (!sameStructure) return faster ? 'Speed up' : 'Slow down'
  if (guide < guideNow) return 'Cut the guide'
  if (guide > guideNow) return 'Stretch the guide'
  return 'Hold'
}

function takenGuide(room: Room, pred: number, depth: number): { guide: number; minutes: number } {
  if (Math.abs(pred - room.minutes) <= 8) return { guide: room.guide, minutes: pred }
  const solved = guideFor(room, depth)
  const guide = room.faster ? Math.min(room.guide, solved) : Math.max(room.guide, solved)
  return { guide, minutes: predictMinutes(room.hands, room.players, room.pace, depth, guide) }
}

export function adviseBlindCall(input: BlindCallInput): BlindCall {
  const cur = rungIndex(input.bigBlind)
  const every = Math.min(8, Math.max(1, Math.floor(input.handsPerLevel)))
  const guide = roundGuide(input.guideSec)
  const pace = input.paceSec ?? 20
  const hands = Math.max(1, Math.floor(input.handsLeft))
  const players = Math.max(2, Math.floor(input.players))
  const started = Math.max(players, Math.floor(input.startedWith))
  const depthNow = averageDepth(input.medianStack, cur, hands, every)
  const nowMin = predictMinutes(hands, players, pace, depthNow, guide)
  const room: Room = {
    minutes: input.minutesLeft,
    hands,
    players,
    started,
    stack: input.medianStack,
    pace,
    guide,
    cur,
    every,
    depthNow,
    faster: nowMin - input.minutesLeft > 0,
  }
  if (closeEnough(nowMin - input.minutesLeft, depthNow)) {
    return pack(LADDER[cur]!, every, guide, nowMin, nowMin, depthNow, depthNow, 'Hold')
  }
  const move = listMoves(room)[0]
  if (move == null) {
    const only = takenGuide(room, nowMin, depthNow)
    return pack(
      LADDER[cur]!,
      every,
      only.guide,
      nowMin,
      only.minutes,
      depthNow,
      depthNow,
      verbFor(room.faster, true, only.guide, guide),
    )
  }
  const taken = takenGuide(room, move.pred, move.depth)
  const same = move.idx === cur && move.every === every
  return pack(
    LADDER[move.idx]!,
    move.every,
    taken.guide,
    nowMin,
    taken.minutes,
    depthNow,
    move.depth,
    verbFor(room.faster, same, taken.guide, guide),
  )
}
