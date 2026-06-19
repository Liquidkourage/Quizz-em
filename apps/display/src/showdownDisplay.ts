import {
  answerCompositionForPlayer,
  communityIndicesFromAnswerComposition,
  inferAnswerComposition,
  PLAYER_ANSWER_DIGIT_CARD_COUNT,
  previewChipPayoutByPlayerId,
  type AnswerCardPick,
  type GameState,
  type NumericCard,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

export type ShowdownCardUsed = { digit: number; source: 'hole' | 'community' }

export type ShowdownResultRow = {
  seat: number
  name: string
  holes: readonly [number, number] | null
  submitted: number | null
  hasFolded: boolean
  /** Full five-card board for this table (showdown). */
  communityBoard: readonly number[] | null
  /** Board indices 0–4 this player used in their composed answer. */
  answerCommunityIndices: number[]
  /** Exactly five picks (0–2 holes + 3–5 board) used to build `submitted`. */
  answerCards: readonly ShowdownCardUsed[]
  /** Projected chips won from the pot (side pots + uncalled returns). */
  chipPayout: number | null
}

function inferCompositionForShowdown(
  holePair: readonly [number, number] | null,
  communityBoard: readonly number[] | null,
  submitted: number | null
): readonly AnswerCardPick[] | null {
  if (
    holePair == null ||
    communityBoard == null ||
    communityBoard.length < 5 ||
    submitted == null
  ) {
    return null
  }
  const hand: NumericCard[] = [
    { digit: holePair[0] as NumericCard['digit'] },
    { digit: holePair[1] as NumericCard['digit'] },
  ]
  const community = communityBoard
    .slice(0, 5)
    .map((d) => ({ digit: d as NumericCard['digit'] }))
  return inferAnswerComposition(hand, community, submitted)
}

/** Map stored/inferred composition to the five digits actually used (not both holes by default). */
export function cardsUsedFromComposition(
  composition: readonly AnswerCardPick[] | null | undefined,
  holes: readonly [number, number] | null,
  board: readonly number[] | null
): ShowdownCardUsed[] {
  if (composition == null || composition.length !== PLAYER_ANSWER_DIGIT_CARD_COUNT) return []
  const out: ShowdownCardUsed[] = []
  for (const pick of composition) {
    if (pick.source === 'hole') {
      if (holes == null || pick.index < 0 || pick.index > 1) return []
      out.push({ digit: holes[pick.index]!, source: 'hole' })
    } else if (pick.source === 'community') {
      if (board == null || pick.index < 0 || pick.index > 4) return []
      const d = board[pick.index]
      if (typeof d !== 'number') return []
      out.push({ digit: d, source: 'community' })
    } else {
      return []
    }
  }
  return out
}

function communityIndicesForPlayer(
  composition: ReturnType<typeof answerCompositionForPlayer>,
  tileIndices: readonly number[] | null | undefined
): number[] {
  if (tileIndices != null && tileIndices.length > 0) return [...tileIndices]
  return communityIndicesFromAnswerComposition(composition ?? undefined)
}

export function showdownCorrectAnswerFromTile(
  tile: DisplayVenueTileSnapshot
): number | undefined {
  const a = tile.showdownAnswer
  return typeof a === 'number' && Number.isFinite(a) ? a : undefined
}

/** TV headline / venue-wide correct answer — prefer wall headline, then headline table tile, then consensus. */
export function resolveVenueShowdownAnswer(
  wall: { headlineQuestionAnswer?: number | null; headlineTableNum?: number | null } | null,
  tileRows: DisplayVenueTileSnapshot[]
): number | undefined {
  const fromWall = wall?.headlineQuestionAnswer
  if (typeof fromWall === 'number' && Number.isFinite(fromWall)) return fromWall

  const headlineNum = wall?.headlineTableNum
  if (headlineNum != null && Number.isFinite(headlineNum)) {
    const headlineTile = tileRows.find(
      (t) => t.tableNum === Math.floor(headlineNum) && t.phase === 'showdown'
    )
    if (headlineTile) {
      const a = showdownCorrectAnswerFromTile(headlineTile)
      if (a != null) return a
    }
  }

  const answers = tileRows
    .filter((t) => t.phase === 'showdown')
    .map((t) => showdownCorrectAnswerFromTile(t))
    .filter((a): a is number => typeof a === 'number' && Number.isFinite(a))
  if (answers.length === 0) return undefined

  const counts = new Map<number, number>()
  for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1)
  let best = answers[0]!
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

/** Build digit-chip row for the authoritative answer on a felt with a full board. */
export function showdownCorrectAnswerRowFromTile(
  tile: DisplayVenueTileSnapshot,
  answer: number
): ShowdownResultRow | null {
  if (!Number.isFinite(answer)) return null
  const communityBoard = communityBoardFromTile(tile)
  if (communityBoard == null || communityBoard.length < 5) return null

  let holePair: readonly [number, number] | null = null
  const holeDigits = tile.seatHoleDigits
  if (holeDigits != null) {
    for (const h of holeDigits) {
      if (h == null || h.length < 2) continue
      if (
        typeof h[0] === 'number' &&
        typeof h[1] === 'number' &&
        Number.isInteger(h[0]) &&
        Number.isInteger(h[1])
      ) {
        holePair = [h[0], h[1]] as const
        break
      }
    }
  }
  if (holePair == null) return null

  const composition = inferCompositionForShowdown(holePair, communityBoard, answer)
  const answerCards = cardsUsedFromComposition(composition, holePair, communityBoard)

  return {
    seat: 0,
    name: '',
    holes: holePair,
    submitted: answer,
    hasFolded: false,
    communityBoard,
    answerCommunityIndices: composition
      ? communityIndicesForPlayer(composition, null)
      : [],
    answerCards,
    chipPayout: null,
  }
}

function communityBoardFromTile(tile: DisplayVenueTileSnapshot): readonly number[] | null {
  const digits = tile.communityDigits
  if (!Array.isArray(digits) || digits.length === 0) return null
  const out: number[] = []
  for (const d of digits) {
    if (typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 9) out.push(d)
  }
  return out.length > 0 ? out : null
}

export function showdownRowsFromTile(tile: DisplayVenueTileSnapshot): ShowdownResultRow[] {
  const names = tile.seatNames ?? []
  const folded = tile.seatFolded ?? []
  const holes = tile.seatHoleDigits
  const guesses = tile.seatSubmittedAnswers
  const communityPicks = tile.seatAnswerCommunityIndices
  const chipPayouts = tile.seatChipPayout
  const communityBoard = communityBoardFromTile(tile)
  const rows: ShowdownResultRow[] = []

  for (let i = 0; i < names.length; i++) {
    const name = typeof names[i] === 'string' ? names[i]!.trim() : ''
    if (!name) continue
    const hasFolded = folded[i] === true
    let holePair: readonly [number, number] | null = null
    const h = holes?.[i]
    if (
      !hasFolded &&
      h != null &&
      h.length >= 2 &&
      typeof h[0] === 'number' &&
      typeof h[1] === 'number'
    ) {
      holePair = [h[0], h[1]]
    }
    let submitted: number | null = null
    if (!hasFolded) {
      const g = guesses?.[i]
      if (typeof g === 'number' && Number.isFinite(g)) submitted = g
    }
    const composition =
      !hasFolded && submitted != null
        ? inferCompositionForShowdown(holePair, communityBoard, submitted)
        : null
    const answerCommunityIndices =
      !hasFolded && submitted != null
        ? communityIndicesForPlayer(composition, communityPicks?.[i] ?? null)
        : []
    const answerCards = cardsUsedFromComposition(composition, holePair, communityBoard)
    const rawPayout = chipPayouts?.[i]
    const chipPayout =
      !hasFolded && typeof rawPayout === 'number' && Number.isFinite(rawPayout) && rawPayout > 0
        ? Math.round(rawPayout)
        : null
    rows.push({
      seat: i + 1,
      name,
      holes: holePair,
      submitted,
      hasFolded,
      communityBoard,
      answerCommunityIndices,
      answerCards,
      chipPayout,
    })
  }
  return rows
}

export function showdownRowsFromGameState(gs: GameState): ShowdownResultRow[] {
  const communityBoard =
    gs.round.communityCards.length > 0
      ? gs.round.communityCards.map((c) => c.digit)
      : null
  const payoutById = previewChipPayoutByPlayerId(gs)
  return gs.players.map((p, i) => {
    const holes: readonly [number, number] | null =
      !p.hasFolded && p.hand.length >= 2
        ? [p.hand[0]!.digit, p.hand[1]!.digit]
        : null
    const submitted =
      !p.hasFolded && typeof p.submittedAnswer === 'number' ? p.submittedAnswer : null
    let composition =
      submitted != null ? answerCompositionForPlayer(p, gs.round.communityCards) : null
    if (composition == null && submitted != null) {
      composition = inferCompositionForShowdown(holes, communityBoard, submitted)
    }
    const answerCommunityIndices =
      submitted != null ? communityIndicesForPlayer(composition, undefined) : []
    const answerCards = cardsUsedFromComposition(composition, holes, communityBoard)
    const rawPayout = payoutById[p.id]
    const chipPayout =
      !p.hasFolded && typeof rawPayout === 'number' && Number.isFinite(rawPayout) && rawPayout > 0
        ? Math.round(rawPayout)
        : null
    return {
      seat: i + 1,
      name: p.name,
      holes,
      submitted,
      hasFolded: p.hasFolded,
      communityBoard,
      answerCommunityIndices,
      answerCards,
      chipPayout,
    }
  })
}

const rowKey = (r: { seat: number; name: string }): string => `${r.seat}:${r.name}`

/** Best row to render the five winning digit chips on a compact venue floor tile. */
export function pickShowdownFloorChipRow(winners: readonly ShowdownResultRow[]): ShowdownResultRow | null {
  if (winners.length === 0) return null
  return winners.find((w) => w.answerCards.length > 0) ?? winners[0]!
}

/**
 * Sort by closeness to the correct answer AND identify every winner
 * (single closest *or* every seat sharing the closest distance / a positive
 * chip payout, since a tie splits the pot). Returns both:
 *   - `winnerKey`: the first winner key (back-compat for single-winner highlights).
 *   - `winnerKeys`: every winner (split-pot aware) so UI can highlight them all.
 */
export function sortShowdownRowsByDistance(
  rows: ShowdownResultRow[],
  correct: number | undefined
): {
  rows: ShowdownResultRow[]
  winnerKey: string | null
  winnerKeys: ReadonlySet<string>
} {
  const ranked = rows.map((r) => {
    const has =
      !r.hasFolded && r.submitted != null && typeof correct === 'number'
    const distance = has ? Math.abs(r.submitted! - correct) : Infinity
    return { ...r, distance, has }
  })
  ranked.sort((a, b) => a.distance - b.distance)

  const winners = new Set<string>()
  /** Trust server-computed payouts first: split pots already award chips to every winner. */
  const paidRows = ranked.filter(
    (r) => !r.hasFolded && typeof r.chipPayout === 'number' && r.chipPayout > 0,
  )
  if (paidRows.length > 0) {
    for (const r of paidRows) winners.add(rowKey(r))
  } else if (ranked.length > 0 && ranked[0]!.distance !== Infinity) {
    const best = ranked[0]!.distance
    for (const r of ranked) {
      if (r.distance === best) winners.add(rowKey(r))
    }
  }

  const winnerKey = winners.size > 0 ? (winners.values().next().value as string) : null

  return {
    rows: ranked.map(
      ({
        seat,
        name,
        holes,
        submitted,
        hasFolded,
        communityBoard,
        answerCommunityIndices,
        answerCards,
        chipPayout,
      }) => ({
        seat,
        name,
        holes,
        submitted,
        hasFolded,
        communityBoard,
        answerCommunityIndices,
        answerCards,
        chipPayout,
      })
    ),
    winnerKey,
    winnerKeys: winners,
  }
}

export function formatHoleDigits(holes: readonly [number, number] | null): string {
  if (holes == null) return '—'
  return `${holes[0]} · ${holes[1]}`
}
