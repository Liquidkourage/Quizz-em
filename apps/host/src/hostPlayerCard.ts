export type HostPlayerCardInput = {
  tableNum: number | null
  seatIndex: number | null
  phone: 'connected' | 'offline' | 'bot'
  offlineSec: number | null
  stack: number | null
  inPot: number | null
  status: 'waiting' | 'in the hand' | 'folded' | 'all-in' | 'points only'
  toAct: boolean
  lastAction: string | null
  phase: string | null
  guess: number | null
  guessLocked: boolean
  triviaPoints: number | null
  correctAnswer: number | null
  excused?: boolean
}

export type HostPlayerCardLine = { label: string; value: string }

const STATUS_LABEL = {
  waiting: 'Waiting',
  'in the hand': 'In the hand',
  folded: 'Folded',
  'all-in': 'All-in',
  'points only': 'Points only',
} as const

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function phoneValue(phone: HostPlayerCardInput['phone'], offlineSec: number | null): string {
  if (phone === 'bot') return 'Practice bot'
  if (phone === 'connected') return 'Connected'
  if (offlineSec == null || offlineSec < 1) return 'Offline'
  if (offlineSec < 60) return `Offline for ${offlineSec} sec`
  return `Offline for ${Math.floor(offlineSec / 60)} min`
}

function placeValue(tableNum: number | null, seatIndex: number | null): string {
  if (tableNum == null) return 'Waiting'
  if (seatIndex == null) return `Table ${tableNum}`
  return `Table ${tableNum}, seat ${seatIndex + 1}`
}

function guessValue(input: HostPlayerCardInput): string | null {
  const live = input.phase === 'answering' || input.phase === 'reveal' || input.phase === 'showdown'
  if (!live) return null
  if (input.excused) return 'Excused'
  if (typeof input.guess === 'number' && Number.isFinite(input.guess)) return String(input.guess)
  if (input.guessLocked) return 'Locked'
  if (input.phase === 'answering') return 'Still open'
  return 'Nothing sent'
}

function distanceValue(input: HostPlayerCardInput): string | null {
  const revealed = input.phase === 'reveal' || input.phase === 'showdown'
  if (!revealed || input.guess == null || input.correctAnswer == null) return null
  if (!Number.isFinite(input.guess) || !Number.isFinite(input.correctAnswer)) return null
  return String(Math.abs(input.guess - input.correctAnswer))
}

export function hostPlayerCard(input: HostPlayerCardInput): HostPlayerCardLine[] {
  const lines: HostPlayerCardLine[] = [
    { label: 'Place', value: placeValue(input.tableNum, input.seatIndex) },
    { label: 'Phone', value: phoneValue(input.phone, input.offlineSec) },
  ]
  if (input.stack != null) lines.push({ label: 'Stack', value: money(input.stack) })
  if (input.tableNum != null && input.inPot != null) lines.push({ label: 'In the pot', value: money(input.inPot) })
  lines.push({ label: 'Status', value: STATUS_LABEL[input.status] })
  if (input.toAct) lines.push({ label: 'Turn', value: 'Waiting on them' })
  if (input.lastAction) lines.push({ label: 'Last action', value: input.lastAction })
  const guess = guessValue(input)
  if (guess != null) lines.push({ label: 'Guess', value: guess })
  const offBy = distanceValue(input)
  if (offBy != null) lines.push({ label: 'Off by', value: offBy })
  if (input.triviaPoints != null) lines.push({ label: 'Trivia points', value: String(input.triviaPoints) })
  return lines
}

export type HostCardSeat = {
  name: string
  offFelt?: boolean
  seatIndex?: number
  kind?: 'pot' | 'points'
  reason?: 'folded' | 'busted' | null
  bankroll?: number
  invested?: number
  guess?: number
  guessLocked?: boolean
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function statusOf(
  tableNum: number | null,
  seat: HostCardSeat | null,
  allIn: boolean,
): HostPlayerCardInput['status'] {
  if (tableNum == null) return 'waiting'
  if (seat?.reason === 'folded') return 'folded'
  if (allIn) return 'all-in'
  if (seat?.offFelt === true || seat?.kind === 'points' || seat?.reason === 'busted') return 'points only'
  return 'in the hand'
}

export function cardInputForPlayer(args: {
  tableNum: number | null
  seat: HostCardSeat | null
  phone?: 'connected' | 'offline' | 'bot'
  offlineSec?: number | null
  allIn?: boolean
  triviaPoints?: number
  phase: string | null
  actingName: string | null
  playerName: string
  lastAction: string | null
  correctAnswer: number | null
  excused?: boolean
}): HostPlayerCardInput {
  const acting = args.actingName != null && namesMatch(args.actingName, args.playerName)
  return {
    tableNum: args.tableNum,
    seatIndex: args.seat?.seatIndex ?? null,
    phone: args.phone ?? 'offline',
    offlineSec: args.offlineSec ?? null,
    stack: args.seat?.bankroll ?? null,
    inPot: args.tableNum == null ? null : (args.seat?.invested ?? null),
    status: statusOf(args.tableNum, args.seat, args.allIn === true),
    toAct: acting && args.phase === 'betting',
    lastAction: args.lastAction,
    phase: args.phase,
    guess: args.seat?.guess ?? null,
    guessLocked: args.seat?.guessLocked === true,
    triviaPoints: args.triviaPoints ?? null,
    correctAnswer: args.correctAnswer,
    excused: args.excused,
  }
}

export function handoffPhoneChoices(
  waiting: readonly { id: string; name: string; phone?: 'connected' | 'offline' | 'bot'; handoff?: boolean }[],
  arrivals: readonly { id: string; name: string; handoff?: boolean }[],
  label: (name: string) => string,
): { id: string; name: string }[] {
  const seen = new Set<string>()
  const rows = [
    ...waiting.filter((row) => row.phone === 'connected'),
    ...arrivals.filter((row) => row.handoff === true),
  ]
  return rows.flatMap((row) => {
    if (seen.has(row.id)) return []
    seen.add(row.id)
    return [{ id: row.id, name: label(row.name) }]
  })
}

export function undoBetOffered(phase: string | null, canUndo: boolean): boolean {
  return phase === 'betting' && canUndo
}

export function lastStreetAction(
  moves: readonly { tableNum: number; playerName: string; kind: string; summary: string }[],
  tableNum: number | null,
  playerName: string,
): string | null {
  if (tableNum == null) return null
  const hit = moves.find(
    (move) => move.tableNum === tableNum && move.kind !== 'submit' && namesMatch(move.playerName, playerName),
  )
  return hit?.summary ?? null
}

export function playerAttention(input: {
  phone?: 'connected' | 'offline' | 'bot'
  toAct: boolean
  phase: string | null
  guess: number | null
  guessLocked: boolean
}): { offline: boolean; toAct: boolean; noGuess: boolean } {
  const guessing = input.phase === 'answering'
  const sent = (typeof input.guess === 'number' && Number.isFinite(input.guess)) || input.guessLocked
  return {
    offline: input.phone === 'offline',
    toAct: input.toAct,
    noGuess: guessing && !sent,
  }
}

export function firstMatchingPlayer<T extends { name: string }>(
  players: readonly T[],
  query: string,
  label: (name: string) => string,
): T | null {
  const needle = query.trim().toLowerCase()
  if (!needle) return null
  return players.find((player) => label(player.name).toLowerCase().includes(needle)) ?? null
}

export type HostHandLine = {
  playerId: string
  questionNum: number
  prompt: string
  guess: number | null
  guessLabel: 'sent' | 'excused' | 'none'
  offBy: number | null
  chips: 'won' | 'lost' | 'folded' | 'sat'
  amount: number
  stackAfter: number
  pointsGained: number
}

function historyGuess(line: HostHandLine): string {
  if (line.guessLabel === 'excused') return 'Excused'
  if (line.guessLabel === 'sent' && line.guess != null) return `Guess ${line.guess}`
  return 'Nothing sent'
}

function historyChips(line: HostHandLine): string | null {
  if (line.chips === 'won') return `Won ${money(line.amount)}`
  if (line.chips === 'lost') return `Lost ${money(line.amount)}`
  if (line.chips === 'folded') return 'Folded'
  return null
}

export function handHistoryText(line: HostHandLine): { title: string; prompt: string; detail: string } {
  const off = line.offBy != null ? `Off by ${line.offBy}` : null
  const points = line.pointsGained > 0 ? `+${line.pointsGained} points` : '0 points'
  const detail = [historyGuess(line), off, historyChips(line), `Stack ${money(line.stackAfter)}`, points]
    .filter((part) => part != null)
    .join(' · ')
  return { title: `Question ${line.questionNum}`, prompt: line.prompt, detail }
}
