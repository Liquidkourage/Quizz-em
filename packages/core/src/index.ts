import { VENUE_NUMBERED_TABLE_MAX, VENUE_WALL_SEAT_SLOTS } from './venueConstants'

export type GamePhase = 'lobby' | 'question' | 'betting' | 'answering' | 'reveal' | 'showdown' | 'payout' | 'intermission';

export type PlayerId = string;

/** Last wagering choice this betting street, by roster seat index (parallel to `players[]`). Cleared when a new street opens. */
export type SeatBettingAction = 'check' | 'call' | 'raise' | 'fold' | 'allIn';

export interface NumericCard { digit: 0|1|2|3|4|5|6|7|8|9 }

/** One card tapped when composing a trivia answer (five picks per submission). */
export type AnswerCardPick = { source: 'hole' | 'community'; index: number };

export interface PlayerState {
  id: PlayerId;
  name: string;
  bankroll: number;
  hand: NumericCard[];
  hasFolded: boolean;
  isAllIn: boolean;
  submittedAnswer?: number;
  /**
   * Wire-only. Set when this seat has locked a guess but the number is withheld
   * from this viewer. The engine does not store it.
   */
  answerLocked?: boolean;
  /**
   * Wire-only. Two hole cards exist for this seat, but the digits are withheld
   * from this viewer. The engine does not store it.
   */
  holesDealt?: boolean;
  /** Five cards used to build `submittedAnswer`, in tap order. */
  answerComposition?: readonly AnswerCardPick[];
  /** Nudge clock expired with no guess. Scores 0 and cannot take the chip pot. */
  answerForfeited?: boolean;
  /** Cumulative trivia score across answered rounds (even when busted off chips). */
  answerPoints?: number;
  /**
   * Busted off the chip rails. Still seated and still dealt cards, so the phone can guess for points.
   * Out of blinds, bets, and the chip pot.
   */
  pointsOnly?: boolean;
}

/** Chips: blinds, action, pot. Trivia submissions still allowed when false. */
export function inChipContest(p: Pick<PlayerState, 'pointsOnly'>): boolean {
  return !p.pointsOnly;
}

/** Seats that can still win the chip pot: not folded, and not busted to points-only. */
export function chipContestantCount(
  players: readonly Pick<PlayerState, 'pointsOnly' | 'hasFolded'>[],
): number {
  let count = 0
  for (const player of players) {
    if (inChipContest(player) && !player.hasFolded) count++
  }
  return count
}

export interface Question {
  id: string;
  text: string;
  answer: number; // authoritative numeric answer
  category?: string;
  difficulty?: number; // 1-5
}

/** Ordered rundown for trivia night — question ids reference the venue question bank. */
export interface Setlist {
  id: string;
  name: string;
  questionIds: string[];
}

export interface RoundState {
  roundId: string;
  question: Question | null;
  communityCards: NumericCard[];
  pot: number;
  dealerIndex: number;
  answerDeadline?: number;
  /**
   * Epoch ms when the acting human’s shot clock expires (server-authoritative).
   * Cleared when wagering is closed or no human is on the clock.
   */
  turnDeadlineMs?: number;
  // Betting state
  bettingRound?: 1 | 2; // 1: pre-community, 2: post-community
  currentBet?: number; // highest bet to be matched in current betting round
  currentPlayerIndex?: number; // seat index of player to act, -1 when closed
  isBettingOpen?: boolean; // when false, actions disabled until host advances
  playerBets?: Record<string, number>; // contributions this betting round by playerId
  /** Indexed by `players[]` seat; cleared at each new wagering street. */
  lastSeatBettingAction?: (SeatBettingAction | null)[];
  /** The action that just happened at this table, in the order it was taken. */
  lastPerformedAction?: { seatIndex: number; action: SeatBettingAction };
  /** Total chips committed this hand (both wagering rounds); drives side-pot eligibility at payout. */
  handContributions?: Record<string, number>;
  /**
   * NLHE-style minimum raise-by for the next full raise (size of the last full raise).
   * Opens at the big blind each street; incomplete all-in raises do not update this.
   */
  lastFullRaiseAmount?: number;
  /** Host closed further bets and raises. Call, check, and fold still stand. */
  raisesClosed?: boolean;
}

/** Contestable pot layer — only `eligiblePlayerIds` may win it (trivia-closest at showdown). */
export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface SidePotSettlement {
  pots: SidePot[];
  /** Uncalled excess returned to the bettor (not in any side pot). */
  returns: Record<string, number>;
}

export interface GameState {
  code: string; // venue / event code (shown to humans; not the socket session id)
  /** Table/seat grouping within one venue — each table has its own capped roster and phase. */
  tableId: string;
  hostId: string;
  createdAt: number;
  phase: GamePhase;
  bigBlind: number;
  smallBlind: number;
  minPlayers: number;
  maxPlayers: number;
  round: RoundState;
  players: PlayerState[];
  /** Players with no stack. They are not seated. Trivia scores only. */
  pointsStandings?: PointsStanding[];
}

/** A player who left the table with no stack. Ranked on the trivia scores, not at a seat. */
export interface PointsStanding {
  id: string;
  name: string;
  answerPoints: number;
}

export const DIGITS: ReadonlyArray<0|1|2|3|4|5|6|7|8|9> = Object.freeze([0,1,2,3,4,5,6,7,8,9]);

/** Sentinel table id — everyone joins here for auto-seating; host runs assign to split into numbered tables. */
export const LOBBY_TABLE_ID = 'LOBBY' as const;

/** Lobby holds every felt. A numbered table holds one felt. */
export function rosterMaxPlayers(tableId: string | null | undefined): number {
  const id = (tableId ?? '').trim()
  if (id === LOBBY_TABLE_ID) return VENUE_NUMBERED_TABLE_MAX * VENUE_WALL_SEAT_SLOTS
  return VENUE_WALL_SEAT_SLOTS
}

/**
 * Chooses how many tables to use for N players given per-table min/max.
 * - At least ceil(N/max) so no table exceeds capacity.
 * - At most floor(N/min) so each table can satisfy min roster (when possible).
 * - Prefers roughly ~6 per table (capped by max) for balance.
 */
export function computeOptimalTableCount(numPlayers: number, maxPerTable: number, minPerTable: number): number {
  if (numPlayers <= 0) return 1;
  const maxPt = Math.max(1, maxPerTable);
  const minPt = Math.max(1, minPerTable);
  const tLow = Math.max(1, Math.ceil(numPlayers / maxPt));
  const tHigh = Math.max(tLow, Math.floor(numPlayers / minPt));
  const target = Math.min(6, maxPt);
  const ideal = Math.max(tLow, Math.round(numPlayers / target));
  return Math.min(tHigh, Math.max(tLow, ideal));
}

export type LobbyTablePin = { playerId: string; tableNum: number }

/**
 * Place lobby players onto `tableCount` tables.
 * Pins lock a player to a table. Everyone else fills the smallest open table, in input order.
 */
export function planLobbyTableGroups<T extends { id: string }>(
  players: readonly T[],
  tableCount: number,
  pins: readonly LobbyTablePin[],
  maxPerTable: number,
): { ok: true; groups: T[][] } | { ok: false; message: string } {
  const maxSeats = Math.max(1, Math.floor(maxPerTable))
  const count = Math.floor(tableCount)
  if (players.length === 0) return { ok: false, message: 'No players in the lobby.' }
  if (!Number.isInteger(count) || count < 1) {
    return { ok: false, message: 'Table count must be at least 1.' }
  }
  const minTables = Math.ceil(players.length / maxSeats)
  if (count < minTables) {
    return {
      ok: false,
      message: `Need at least ${minTables} tables for ${players.length} players (${maxSeats} seats each).`,
    }
  }
  if (count > players.length) {
    return {
      ok: false,
      message: `${players.length} players can fill at most ${players.length} tables.`,
    }
  }

  const byId = new Map(players.map((p) => [p.id, p]))
  const groups: T[][] = Array.from({ length: count }, () => [])
  const placed = new Set<string>()

  for (const pin of pins) {
    const player = byId.get(pin.playerId)
    if (!player || placed.has(player.id)) continue
    const tableNum = Math.floor(pin.tableNum)
    if (!Number.isInteger(tableNum) || tableNum < 1 || tableNum > count) {
      return { ok: false, message: `Table ${pin.tableNum} is outside 1–${count}.` }
    }
    const bucket = groups[tableNum - 1]!
    if (bucket.length >= maxSeats) {
      return { ok: false, message: `Table ${tableNum} is full (${maxSeats} seats).` }
    }
    bucket.push(player)
    placed.add(player.id)
  }

  for (const player of players) {
    if (placed.has(player.id)) continue
    let best = -1
    let bestLen = Infinity
    for (let i = 0; i < groups.length; i++) {
      const len = groups[i]!.length
      if (len < maxSeats && len < bestLen) {
        best = i
        bestLen = len
      }
    }
    if (best < 0) {
      return { ok: false, message: `Not enough seats for ${players.length} players.` }
    }
    groups[best]!.push(player)
    placed.add(player.id)
  }

  const empty = groups.findIndex((g) => g.length === 0)
  if (empty >= 0) {
    return {
      ok: false,
      message: `Table ${empty + 1} has no one. Assign a player or use fewer tables.`,
    }
  }

  return { ok: true, groups }
}

/** Near-equal split, e.g. 11 → [6,5] for 2 tables. */
export function splitIntoTableSizes(totalPlayers: number, tableCount: number): number[] {
  const t = Math.max(1, Math.floor(tableCount));
  if (totalPlayers <= 0) return Array(t).fill(0);
  const base = Math.floor(totalPlayers / t);
  const rem = totalPlayers % t;
  const sizes: number[] = [];
  for (let i = 0; i < t; i++) {
    sizes.push(base + (i < rem ? 1 : 0));
  }
  return sizes;
}

export function compareHandsToAnswer(candidateNumbers: number[], correctAnswer: number): number {
  if (candidateNumbers.length === 0) return Infinity;
  let best = Infinity;
  for (const value of candidateNumbers) {
    const delta = Math.abs(value - correctAnswer);
    if (delta < best) best = delta;
  }
  return best;
}

/** Player UI uses exactly this many digit cards (+ optional decimal) for the submitted value. */
export const PLAYER_ANSWER_DIGIT_CARD_COUNT = 5;

const ANSWER_NUMERIC_EPS = 1e-7;

/** Loose equality for values built from decimal strings vs submitted doubles. */
export function nearlyEqualNumbers(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= ANSWER_NUMERIC_EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Human-readable trivia / guess values — strips float noise; commas for |n| ≥ 1,000. */
export function formatTriviaNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  const fixed = rounded.toFixed(6);
  const trimmed = fixed.replace(/\.?0+$/, '');
  if (trimmed === '' || trimmed === '-') return '0';
  const neg = trimmed.startsWith('-');
  const abs = neg ? trimmed.slice(1) : trimmed;
  const [intPart, fracPart] = abs.split('.');
  const withCommas = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = fracPart != null ? `${withCommas}.${fracPart}` : withCommas;
  return neg ? `-${body}` : body;
}

function addDecimalVariantsForFiveDigits(digitsFive: number[], sink: Set<number>): void {
  sink.add(Number(digitsFive.join('')));
  for (let k = 1; k <= PLAYER_ANSWER_DIGIT_CARD_COUNT - 1; k++) {
    const left = digitsFive.slice(0, k).join('');
    const right = digitsFive.slice(k).join('');
    if (left !== '' && right !== '') sink.add(Number(`${left}.${right}`));
  }
}

/** All numbers you can legally form using exactly five of seven digit cards in order, optional one decimal (player rules). */
export function composeNumericAnswersFromSevenDigitCards(sevenDigits: number[]): Set<number> {
  const out = new Set<number>();
  if (sevenDigits.length !== 7) return out;
  const path: number[] = [];
  const used = [false, false, false, false, false, false, false];
  const dfs = () => {
    if (path.length === PLAYER_ANSWER_DIGIT_CARD_COUNT) {
      const five = path.map((i) => sevenDigits[i]!);
      addDecimalVariantsForFiveDigits(five, out);
      return;
    }
    for (let i = 0; i < 7; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(i);
      dfs();
      path.pop();
      used[i] = false;
    }
  };
  dfs();
  return out;
}

export function communityIndicesFromAnswerComposition(
  composition: readonly AnswerCardPick[] | undefined
): number[] {
  if (composition == null) return [];
  const out: number[] = [];
  for (const pick of composition) {
    if (pick.source !== 'community') continue;
    if (Number.isInteger(pick.index) && pick.index >= 0 && pick.index <= 4) {
      out.push(pick.index);
    }
  }
  return out;
}

/** Reconstruct which five cards built `answer` when composition was not stored (e.g. bots). */
export function inferAnswerComposition(
  hand: readonly NumericCard[],
  community: readonly NumericCard[],
  answer: number
): AnswerCardPick[] | null {
  if (hand.length < 2 || community.length < 5 || !Number.isFinite(answer)) return null;
  const seven = [...hand.slice(0, 2), ...community.slice(0, 5)].map((c) => c.digit);
  const path: number[] = [];
  const used = [false, false, false, false, false, false, false];
  let found: AnswerCardPick[] | null = null;

  const pickFromSevenIndex = (i: number): AnswerCardPick =>
    i <= 1 ? { source: 'hole', index: i } : { source: 'community', index: i - 2 };

  const dfs = () => {
    if (found) return;
    if (path.length === PLAYER_ANSWER_DIGIT_CARD_COUNT) {
      const five = path.map((i) => seven[i]!);
      const vals = new Set<number>();
      addDecimalVariantsForFiveDigits(five, vals);
      for (const v of vals) {
        if (nearlyEqualNumbers(v, answer)) {
          found = path.map(pickFromSevenIndex);
          return;
        }
      }
      return;
    }
    for (let i = 0; i < 7; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(i);
      dfs();
      path.pop();
      used[i] = false;
      if (found) return;
    }
  };
  dfs();
  return found;
}

export function answerCompositionForPlayer(
  player: Pick<PlayerState, 'hand' | 'submittedAnswer' | 'answerComposition'>,
  community: readonly NumericCard[]
): readonly AnswerCardPick[] | null {
  if (player.answerComposition != null && player.answerComposition.length === PLAYER_ANSWER_DIGIT_CARD_COUNT) {
    return player.answerComposition;
  }
  if (typeof player.submittedAnswer !== 'number') return null;
  return inferAnswerComposition(player.hand, community, player.submittedAnswer);
}

export function isSubmittedAnswerComposableFromDeal(state: GameState, playerId: string, answer: number): boolean {
  if (!Number.isFinite(answer)) return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.hand.length !== 2 || state.round.communityCards.length !== 5) return false;
  const seven = [...player.hand, ...state.round.communityCards].map((c) => c.digit);
  for (const v of composeNumericAnswersFromSevenDigitCards(seven)) {
    if (nearlyEqualNumbers(v, answer)) return true;
  }
  return false;
}

/** Best legal guess for bots: minimum distance to `target`, tie-break lower numeric value. */
export function nearestLegalAnswerToTarget(sevenDigits: number[], target: number): number {
  if (sevenDigits.length !== 7 || !Number.isFinite(target)) return 0;
  const values = composeNumericAnswersFromSevenDigitCards(sevenDigits);
  let best: number | null = null;
  let bestD = Infinity;
  for (const v of values) {
    const d = Math.abs(v - target);
    if (d < bestD - 1e-15) {
      bestD = d;
      best = v;
    } else if (best !== null && Math.abs(d - bestD) <= 1e-15 && v < best) {
      best = v;
    }
  }
  return best ?? 0;
}

export function generateAllArrangements(digits: number[]): number[] {
  // generate all permutations and interpret as base-10 numbers without leading zero trimming
  const results: number[] = [];
  const used = new Array(digits.length).fill(false);
  const stack: number[] = [];
  const dfs = () => {
    if (stack.length === digits.length) {
      const value = Number(stack.join(''));
      results.push(value);
      return;
    }
    for (let i=0;i<digits.length;i++) {
      if (used[i]) continue;
      used[i] = true;
      stack.push(digits[i]);
      dfs();
      stack.pop();
      used[i] = false;
    }
  };
  dfs();
  return results;
}

export function bestHandDistanceToAnswer(hand: NumericCard[], community: NumericCard[], answer: number): number {
  if (hand.length !== 2 || community.length !== 5) return Infinity;
  const seven = hand.concat(community).map((c) => c.digit);
  const candidates = [...composeNumericAnswersFromSevenDigitCards(seven)];
  return compareHandsToAnswer(candidates, answer);
}

export function createEmptyGame(code: string, hostId: string = '', tableId: string = '1'): GameState {
  const table = typeof tableId === 'string' && tableId.trim() ? tableId.trim() : '1'
  return {
    code,
    tableId: table,
    hostId,
    createdAt: Date.now(),
    phase: 'lobby',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: rosterMaxPlayers(table),
    round: {
      roundId: 'r1',
      question: null,
      communityCards: [],
      pot: 0,
      dealerIndex: 0,
      bettingRound: 1,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
      handContributions: {},
    },
    players: [],
  };
}

/** Case-insensitive display-name check within one felt / lobby roster. */
export function isDisplayNameTaken(
  state: GameState,
  name: string,
  exceptPlayerId?: string,
): boolean {
  const norm = name.trim().toLowerCase()
  if (!norm) return false
  return state.players.some(
    (p) => p.id !== exceptPlayerId && p.name.trim().toLowerCase() === norm,
  )
}

export function addPlayer(state: GameState, id: string, name: string, startingBankroll = 1000): GameState {
  if (state.players.find(p => p.id === id)) return state;
  return {
    ...state,
    players: state.players.concat({
      id,
      name,
      bankroll: startingBankroll,
      hand: [],
      hasFolded: false,
      isAllIn: false,
      answerPoints: 0,
      pointsOnly: false,
    }),
  };
}

export function removePlayer(state: GameState, id: string): GameState {
  return { ...state, players: state.players.filter(p => p.id !== id) };
}

/** Seat index after one player leaves. `-1` when the list is empty or nobody was to act. */
function seatIndexAfterDrop(index: number, removed: number, remaining: number): number {
  if (remaining <= 0 || index < 0) return -1
  if (index > removed) return index - 1
  if (index === removed) return removed % remaining
  return index
}

function openBettorLeaving(state: GameState, player: PlayerState): boolean {
  return (
    state.phase === 'betting' &&
    state.round.isBettingOpen === true &&
    inChipContest(player) &&
    !player.hasFolded
  )
}

function stateWithoutSeat(state: GameState, playerId: string): GameState {
  const dropped = state.players.findIndex((p) => p.id === playerId)
  if (dropped < 0) return state
  const players = state.players.filter((p) => p.id !== playerId)
  const acts = state.round.lastSeatBettingAction
  const current = seatIndexAfterDrop(state.round.currentPlayerIndex ?? -1, dropped, players.length)
  const dealer = players.length === 0 ? 0 : seatIndexAfterDrop(state.round.dealerIndex, dropped, players.length)
  return {
    ...state,
    players,
    round: {
      ...state.round,
      dealerIndex: dealer < 0 ? 0 : dealer,
      currentPlayerIndex: current,
      lastSeatBettingAction: acts == null ? acts : acts.filter((_, index) => index !== dropped),
      lastPerformedAction: shiftLastPerformedAction(state.round.lastPerformedAction, dropped),
      isBettingOpen: players.length === 0 ? false : state.round.isBettingOpen,
    },
  }
}

/**
 * Take a player out of this felt. An open wager folds first so the street can finish.
 * Chips already in the pot stay there. The leftover stack leaves with the seat.
 */
function standingForReleasedPlayer(state: GameState, player: PlayerState): PointsStanding | null {
  const name = player.name.trim()
  if (!name) return null
  const correct = state.round.question?.answer
  const gained = typeof correct === 'number' ? answerRoundPointsGained(player, correct) : 0
  const raw = (player.answerPoints ?? 0) + gained
  return {
    id: player.id,
    name,
    answerPoints: Number.isFinite(raw) ? Math.max(0, raw) : 0,
  }
}

export function releasePlayer(state: GameState, playerId: string): GameState {
  const seat = state.players.findIndex((p) => p.id === playerId)
  if (seat < 0) return state
  const player = state.players[seat]!
  const folded = openBettorLeaving(state, player) ? foldPlayer(state, playerId) : state
  const without = stateWithoutSeat(folded, playerId)
  const standing = standingForReleasedPlayer(state, player)
  if (!standing) return without
  return {
    ...without,
    pointsStandings: mergePointsStandings(without.pointsStandings, [standing]),
  }
}

export function dealCard(): NumericCard {
  const digit = DIGITS[Math.floor(Math.random()*DIGITS.length)];
  return { digit };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function nextRoundId(prev: string): string {
  const n = Number(prev.replace(/[^0-9]/g, '')) || 0;
  return `r${n+1}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

// Sample questions for gameplay — full 25-question starter set (see starterQuestionSet.ts)
export {
  VENUE_QUESTION_SET_LENGTH,
  STARTER_QUESTION_SET,
  STARTER_SETLIST_ID,
  STARTER_SETLIST_NAME,
  formatSetlistProgress,
  isSetlistTargetLength,
  createStarterSetlist,
} from './starterQuestionSet'
export { STARTER_QUESTION_SET as SAMPLE_QUESTIONS } from './starterQuestionSet'

// Game flow functions
function roundStateForQuestionSetup(round: RoundState): RoundState {
  return {
    ...round,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: -1,
    isBettingOpen: false,
    playerBets: {},
    handContributions: {},
    bettingRound: 1,
    lastSeatBettingAction: undefined,
    lastPerformedAction: undefined,
  };
}

// Game flow functions
export function startGame(state: GameState): GameState {
  return { ...state, phase: 'question', round: roundStateForQuestionSetup(state.round) };
}

/** Sets the active round question (synced to tables by the server). */
export function setQuestion(state: GameState, question: Question): GameState {
  return {
    ...state,
    phase: 'question',
    round: { ...roundStateForQuestionSetup(state.round), question },
  };
}

export function pickRandomQuestion(bank: Question[]): Question | undefined {
  if (bank.length === 0) return undefined
  const i = Math.floor(Math.random() * bank.length)
  return bank[i]
}

export function playersHaveHoleCards(state: GameState): boolean {
  return state.players.some((p) => p.hand.length >= 2);
}

/** Deal two hole cards per player; stays in question until trivia opens wagering. No-op until a question is on the table. */
export function dealHoleCards(state: GameState): GameState {
  if (state.phase !== 'question' || state.players.length === 0) return state;
  if (state.round.question == null) return state;
  if (playersHaveHoleCards(state)) return state;
  const updatedPlayers = state.players.map((player) => ({
    ...player,
    hand: [dealCard(), dealCard()],
  }));
  return {
    ...state,
    phase: 'question',
    players: updatedPlayers,
    round: {
      ...state.round,
      communityCards: [],
      isBettingOpen: false,
      currentPlayerIndex: -1,
      currentBet: 0,
      playerBets: {},
      handContributions: {},
      bettingRound: 1,
      lastSeatBettingAction: undefined,
      lastPerformedAction: undefined,
    },
  };
}

/** Post blinds and open wagering round 1 once hole cards and a question are set. */
export function openBettingRound1(state: GameState): GameState {
  if (state.phase !== 'question' || state.players.length === 0) return state;
  if (state.round.question == null) return state;
  if (!playersHaveHoleCards(state)) return state;

  const playersWithHands = state.players;
  const chipSeatCount = chipContestantCount(playersWithHands);
  /** One seat left in the chips has already won the pot. Leave them to answer for points. */
  if (chipSeatCount < 2) {
    return {
      ...state,
      phase: 'betting',
      players: playersWithHands,
      round: {
        ...state.round,
        communityCards: [],
        bettingRound: 1,
        currentBet: 0,
        currentPlayerIndex: -1,
        isBettingOpen: false,
        playerBets: {},
        handContributions: {},
        pot: state.round.pot,
        lastFullRaiseAmount: Math.max(state.bigBlind, 0),
        raisesClosed: false,
        lastSeatBettingAction: Array.from({ length: playersWithHands.length }, () => null),
        lastPerformedAction: undefined,
      },
    };
  }
  const nextChipSeat = (fromExclusive: number): number => {
    if (playersWithHands.length === 0 || chipSeatCount === 0) return -1;
    for (let step = 1; step <= playersWithHands.length; step++) {
      const idx = (fromExclusive + step) % playersWithHands.length;
      if (inChipContest(playersWithHands[idx]!)) return idx;
    }
    return -1;
  };

  const smallBlindIndex = nextChipSeat(state.round.dealerIndex);
  const bigBlindIndex =
    chipSeatCount <= 1 ? smallBlindIndex : nextChipSeat(smallBlindIndex);

  let playersAfterBlinds = playersWithHands;
  let pot = state.round.pot;
  const playerBets: Record<string, number> = {};
  const handContributions: Record<string, number> = {};

  const postBlind = (idx: number, amount: number) => {
    if (idx < 0 || idx >= playersAfterBlinds.length || amount <= 0) return;
    const player = playersAfterBlinds[idx];
    if (player.pointsOnly) return;
    const contribution = Math.min(player.bankroll, amount);
    playersAfterBlinds = playersAfterBlinds.map((p, i) =>
      i === idx ? { ...p, bankroll: p.bankroll - contribution, isAllIn: p.bankroll - contribution === 0 } : p,
    );
    pot += contribution;
    playerBets[player.id] = (playerBets[player.id] || 0) + contribution;
    handContributions[player.id] = (handContributions[player.id] || 0) + contribution;
  };

  postBlind(smallBlindIndex, state.smallBlind);
  postBlind(bigBlindIndex, state.bigBlind);

  const startIndex =
    playersAfterBlinds.length > 0 ? (bigBlindIndex + 1) % playersAfterBlinds.length : -1;
  const findNextToAct = (start: number): number => {
    if (playersAfterBlinds.length === 0) return -1;
    for (let step = 0; step < playersAfterBlinds.length; step++) {
      const idx = (start + step) % playersAfterBlinds.length;
      const p = playersAfterBlinds[idx];
      if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return idx;
    }
    return -1;
  };

  const currentPlayerIndex = findNextToAct(startIndex);
  const isBettingOpen = currentPlayerIndex >= 0;

  return {
    ...state,
    phase: 'betting',
    players: playersAfterBlinds,
    round: {
      ...state.round,
      communityCards: [],
      bettingRound: 1,
      currentBet: Math.max(state.bigBlind, 0),
      currentPlayerIndex: isBettingOpen ? currentPlayerIndex : -1,
      isBettingOpen,
      playerBets,
      handContributions,
      pot,
      lastFullRaiseAmount: Math.max(state.bigBlind, 0),
      raisesClosed: false,
      lastSeatBettingAction: Array.from({ length: playersAfterBlinds.length }, () => null),
      lastPerformedAction: undefined,
    },
  };
}

/** Deal holes if needed, then open round 1 when a question is already loaded. */
export function dealInitialCards(state: GameState): GameState {
  let next = dealHoleCards(state);
  if (next.round.question != null) {
    next = openBettingRound1(next);
  }
  return next;
}

/**
 * Build main + side pots from unequal all-ins. Folded players' chips stay in the pot but they are not eligible to win.
 * Single-eligible layers (uncalled overbet) are returned instead of contested.
 */
export function buildSidePotSettlement(
  contributions: Record<string, number>,
  foldedByPlayerId: Record<string, boolean>
): SidePotSettlement {
  const entries = Object.entries(contributions)
    .map(([id, amount]) => ({
      id,
      amount: typeof amount === 'number' && Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0,
      folded: foldedByPlayerId[id] === true,
    }))
    .filter((e) => e.amount > 0);

  if (entries.length === 0) return { pots: [], returns: {} };

  const levels = [...new Set(entries.map((e) => e.amount))].sort((a, b) => a - b);
  const pots: SidePot[] = [];
  const returns: Record<string, number> = {};
  let prev = 0;

  for (const level of levels) {
    const increment = level - prev;
    if (increment <= 0) continue;

    const atLevel = entries.filter((e) => e.amount >= level);
    const eligible = atLevel.filter((e) => !e.folded);
    const layerTotal = increment * atLevel.length;

    if (eligible.length === 0) {
      for (const e of atLevel) {
        returns[e.id] = (returns[e.id] || 0) + increment;
      }
    } else if (eligible.length === 1 && atLevel.length === 1) {
      returns[eligible[0]!.id] = (returns[eligible[0]!.id] || 0) + layerTotal;
    } else {
      pots.push({
        amount: layerTotal,
        eligiblePlayerIds: eligible.map((e) => e.id),
      });
    }
    prev = level;
  }

  return { pots, returns };
}

export type LiveSidePot = { mark: number; amount: number }

/** Every side-pot number each seat can win. The main pot is the first contested layer. */
export function livePotLayers(
  amounts: readonly number[],
  folded: readonly boolean[],
): { main: number; sides: LiveSidePot[]; marks: number[][] } {
  const contributions: Record<string, number> = {}
  const foldedById: Record<string, boolean> = {}
  for (let i = 0; i < amounts.length; i++) {
    contributions[String(i)] = amounts[i] ?? 0
    foldedById[String(i)] = folded[i] === true
  }
  const { pots } = buildSidePotSettlement(contributions, foldedById)
  const marks: number[][] = amounts.map(() => [])
  writeSidePotMarks(pots, marks)
  return { main: pots[0]?.amount ?? 0, sides: sidePotTotals(pots), marks }
}

function sidePotTotals(pots: SidePot[]): LiveSidePot[] {
  const sides: LiveSidePot[] = []
  for (let layer = 1; layer < pots.length; layer++) {
    sides.push({ mark: layer, amount: pots[layer]!.amount })
  }
  return sides
}

function writeSidePotMarks(pots: SidePot[], marks: number[][]): void {
  for (let layer = 1; layer < pots.length; layer++) {
    for (const id of pots[layer]!.eligiblePlayerIds) {
      const index = Number(id)
      const seat = marks[index]
      if (seat != null) seat.push(layer)
    }
  }
}

/** Main pot for a live hand. Falls back to the table total when nobody has committed chips. */
export function displayedMainPot(state: GameState): number {
  const { main } = livePotLayers(
    state.players.map((player) => state.round.handContributions?.[player.id] ?? 0),
    state.players.map((player) => player.hasFolded === true || player.pointsOnly === true),
  )
  if (main > 0) return main
  const raw = state.round.pot ?? 0
  return Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0))
}

/**
 * Seat indices for dealer + blinds mapped to contiguous `players[0 .. n-1]`, identical to `{@link dealInitialCards}` modulo math.
 * Use on venue-wall displays with `seatNames[]` indexed the same way; null when absent (no players / one player has no blinds).
 */
/**
 * Whole-dollar pot for venue-wall tiles — mirrors {@link RoundState.pot} once blinds/bets post,
 * with a defensive fallback to total {@link RoundState.handContributions} when the engine pot reads 0 mid-hand.
 */
export function venueWallDisplayPot(state: GameState): number {
  const raw = state.round.pot ?? 0;
  const pot = Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0));
  if (pot > 0) return pot;

  const phase = state.phase;
  if (
    phase !== 'betting' &&
    phase !== 'answering' &&
    phase !== 'reveal' &&
    phase !== 'showdown' &&
    phase !== 'payout'
  ) {
    return 0;
  }

  const hc = state.round.handContributions;
  if (hc == null) return 0;
  let sum = 0;
  for (const v of Object.values(hc)) {
    if (typeof v === 'number' && Number.isFinite(v)) sum += Math.max(0, Math.floor(v));
  }
  return sum;
}

export function displayBlindSeatIndices(
  seatedPlayerCount: number,
  dealerIndex: number
): {
  dealerSeatIndex: number | null;
  smallBlindSeatIndex: number | null;
  bigBlindSeatIndex: number | null;
} {
  const n = Math.max(0, Math.floor(seatedPlayerCount));
  if (n <= 0) return { dealerSeatIndex: null, smallBlindSeatIndex: null, bigBlindSeatIndex: null };
  const d = ((Math.floor(dealerIndex) % n) + n) % n;
  if (n === 1) return { dealerSeatIndex: d, smallBlindSeatIndex: null, bigBlindSeatIndex: null };
  return {
    dealerSeatIndex: d,
    smallBlindSeatIndex: (d + 1) % n,
    bigBlindSeatIndex: (d + 2) % n,
  };
}

/** Seat whose action it is during open wagering (`players[]` / venue `seatNames` index). Null otherwise. */
export function displayActingSeatIndex(
  phase: GamePhase | string,
  seatedPlayerCount: number,
  round: Partial<Pick<RoundState, 'currentPlayerIndex' | 'isBettingOpen'>>
): number | null {
  const ph = String(phase ?? '').trim().toLowerCase();
  if (ph !== 'betting') return null;
  // Only an explicit `false` means “no one may act”. Missing / undefined must not hide a valid `currentPlayerIndex`
  // (older snapshots, partial merges, or JSON without the flag).
  if (round.isBettingOpen === false) return null;

  const raw = round.currentPlayerIndex as unknown;
  let idx: number | undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) idx = raw;
  else if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) idx = n;
  }

  const n = Math.max(0, Math.floor(seatedPlayerCount));
  if (idx === undefined) return null;
  const i = Math.floor(idx);
  if (i < 0 || i >= n) return null;
  return i;
}

/** True only when the engine clock allows checks, calls, raises, and folds. */
export function isWageringClockOpen(
  round: Partial<Pick<RoundState, 'isBettingOpen'>>
): boolean {
  return round.isBettingOpen === true;
}

/** `betting` phase with the clock closed until the host advances (deal board or start answering). */
export function isWageringPaused(
  phase: GamePhase | string,
  round: Partial<Pick<RoundState, 'isBettingOpen' | 'currentPlayerIndex'>>
): boolean {
  const ph = String(phase ?? '').trim().toLowerCase();
  if (ph !== 'betting') return false;
  if (isWageringClockOpen(round)) return false;
  if (round.isBettingOpen === false) return true;
  const raw = round.currentPlayerIndex as unknown;
  if (typeof raw === 'number' && Number.isFinite(raw) && Math.floor(raw) === -1) return true;
  return false;
}

/** Corner / info-bar copy during `betting` (open clock vs between host steps). */
export function displayBettingPhaseLabel(
  round: Partial<
    Pick<RoundState, 'isBettingOpen' | 'currentPlayerIndex' | 'bettingRound' | 'communityCards'>
  >
): string {
  if (isWageringClockOpen(round)) return 'Wagering';
  return 'All bets are in!';
}

/** Venue mosaic tile: paused when the clock is not explicitly open (same rule for round 1 and 2). */
export function isVenueTileWageringPaused(row: {
  phase: string;
  isBettingOpen?: boolean | null;
  currentPlayerIndex?: number | null;
  bettingRound?: number | null;
  communityDigits?: number[] | null;
}): boolean {
  const ph = String(row.phase ?? '').trim().toLowerCase();
  if (ph !== 'betting') return false;
  if (row.isBettingOpen === true) return false;
  if (row.isBettingOpen === false) return true;
  const idx =
    typeof row.currentPlayerIndex === 'number' && Number.isFinite(row.currentPlayerIndex)
      ? Math.floor(row.currentPlayerIndex)
      : null;
  if (idx === -1) return true;
  return false;
}

function tileChairIndex(raw: number | null | undefined): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const i = Math.floor(raw);
  if (i < 0 || i >= VENUE_WALL_SEAT_SLOTS) return null;
  return i;
}

/** Acting chair on a venue tile. Chair numbers run around the felt, past the seated count. */
export function venueTileActingSeatIndex(
  row: {
    phase: string;
    seated: number;
    isBettingOpen?: boolean | null;
    currentPlayerIndex?: number | null;
    actingSeatIndex?: number | null;
  }
): number | null {
  const ph = String(row.phase ?? '').trim().toLowerCase();
  if (ph !== 'betting' || row.seated < 1) return null;
  if (row.isBettingOpen !== true) return null;
  return tileChairIndex(row.currentPlayerIndex) ?? tileChairIndex(row.actingSeatIndex);
}

/** After round-1 wagering is closed: deal five community cards and open round-2 wagering. */
export function dealCommunityCards(state: GameState): GameState {
  if (state.phase !== 'betting') return state;
  if (state.round.bettingRound !== 1) return state;
  if (state.round.isBettingOpen) return state;
  if ((state.round.communityCards?.length ?? 0) >= 5) return state;

  const communityCards: NumericCard[] = [dealCard(), dealCard(), dealCard(), dealCard(), dealCard()];

  const findNextToAct = (): number => {
    const players = state.players;
    if (players.length === 0) return -1;
    const start = (state.round.dealerIndex + 1) % players.length;
    for (let step = 0; step < players.length; step++) {
      const idx = (start + step) % players.length;
      const p = players[idx];
      if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return idx;
    }
    return -1;
  };

  const contesting = chipContestantCount(state.players);
  const currentPlayerIndex = contesting < 2 ? -1 : findNextToAct();
  const isBettingOpen = currentPlayerIndex >= 0;

  return {
    ...state,
    phase: 'betting',
    round: {
      ...state.round,
      communityCards,
      bettingRound: 2,
      currentBet: 0,
      currentPlayerIndex: isBettingOpen ? currentPlayerIndex : -1,
      isBettingOpen,
      playerBets: {},
      lastFullRaiseAmount: Math.max(state.bigBlind, 0),
      raisesClosed: false,
      lastSeatBettingAction: Array.from({ length: state.players.length }, () => null),
      lastPerformedAction: undefined,
    },
  };
}

/** Minimum legal raise-by (chips above the call) for a full raise. */
export function minRaiseByAmount(state: GameState): number {
  const fromStreet = state.round.lastFullRaiseAmount
  if (typeof fromStreet === 'number' && Number.isFinite(fromStreet) && fromStreet > 0) {
    return Math.floor(fromStreet)
  }
  return Math.max(0, Math.floor(state.bigBlind || 0))
}

export function placeBet(state: GameState, playerId: string, amount: number): GameState {
  if (amount <= 0) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0) return state;
  const bankroll = state.players[seat]!.bankroll;
  const capped = Math.min(Math.floor(amount), Math.max(0, bankroll));
  if (capped <= 0) return state;
  const updatedPlayers = state.players.map(player => {
    if (player.id === playerId) {
      const newBankroll = Math.max(0, player.bankroll - capped);
      return { ...player, bankroll: newBankroll, isAllIn: newBankroll === 0 };
    }
    return player;
  });
  const handContributions = { ...(state.round.handContributions || {}) };
  handContributions[playerId] = (handContributions[playerId] || 0) + capped;

  return {
    ...state,
    round: {
      ...state.round,
      pot: state.round.pot + capped,
      playerBets: { ...(state.round.playerBets || {}), [playerId]: ((state.round.playerBets || {})[playerId] || 0) + capped },
      handContributions,
    },
    players: updatedPlayers,
  };
}

// Betting helpers and actions
function getSeatIndexByPlayerId(state: GameState, playerId: string): number {
  return state.players.findIndex(p => p.id === playerId);
}

function amountToCall(state: GameState, playerId: string): number {
  const current = state.round.currentBet || 0;
  const contributed = (state.round.playerBets || {})[playerId] || 0;
  return Math.max(0, current - contributed);
}

/** Chips the player must add to call the current bet (capped by their remaining stack). */
export function chipsRequiredToCall(state: GameState, playerId: string): number {
  const to = amountToCall(state, playerId);
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0) return 0;
  return Math.min(to, state.players[seat].bankroll);
}

/** Share of current stack (0–100) required to call; `null` when stack is zero. */
export function pctOfStackToCall(state: GameState, playerId: string): number | null {
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0) return null;
  if (state.players[seat]?.pointsOnly) return null;
  const br = state.players[seat].bankroll;
  if (br <= 0) return null;
  return (chipsRequiredToCall(state, playerId) / br) * 100;
}

function shiftLastPerformedAction(
  action: RoundState['lastPerformedAction'],
  dropped: number,
): RoundState['lastPerformedAction'] {
  if (action == null) return action
  if (action.seatIndex === dropped) return undefined
  if (action.seatIndex > dropped) return { ...action, seatIndex: action.seatIndex - 1 }
  return action
}

function seatActionRecord(
  round: RoundState,
  playerCount: number,
  seat: number,
  action: SeatBettingAction,
): Pick<RoundState, 'lastSeatBettingAction' | 'lastPerformedAction'> {
  return {
    lastSeatBettingAction: mergeLastSeatBettingAction(round, playerCount, seat, action),
    lastPerformedAction: { seatIndex: seat, action },
  }
}

function mergeLastSeatBettingAction(
  round: RoundState,
  playerCount: number,
  seat: number,
  action: SeatBettingAction
): (SeatBettingAction | null)[] {
  const prev = round.lastSeatBettingAction;
  return Array.from({ length: playerCount }, (_, i) => {
    if (i === seat) return action;
    if (prev && i < prev.length) return prev[i] ?? null;
    return null;
  });
}

function advanceToNextPlayer(state: GameState): number {
  const players = state.players;
  if (!players.length || typeof state.round.currentPlayerIndex !== 'number') return -1;
  for (let step = 1; step <= players.length; step++) {
    const idx = ((state.round.currentPlayerIndex as number) + step) % players.length;
    const p = players[idx];
    if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return idx;
  }
  return -1;
}

function isBettingComplete(state: GameState): boolean {
  if (!state.round.isBettingOpen) return true;
  if (chipContestantCount(state.players) < 2) return true;
  const cur = state.round.currentBet || 0;
  const bets = state.round.playerBets || {};
  const lastActions = state.round.lastSeatBettingAction ?? [];
  let activeCount = 0;
  let actedCount = 0;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i]!;
    if (p.hasFolded) continue;
    if (p.isAllIn) continue;
    if (!inChipContest(p)) continue;
    activeCount++;
    const contributed = bets[p.id] || 0;
    if (contributed < cur) return false;
    if (contributed > cur) {
      // One seat posting both blinds can exceed currentBet until that player acts.
      if (activeCount !== 1 || lastActions[i] == null) return false;
    }
    if (lastActions[i] != null) actedCount++;
  }
  if (activeCount === 0) return true;
  // Lone actor on an unopened street still needs to check/raise (common post-board).
  if (activeCount === 1 && cur === 0) {
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i]!;
      if (p.hasFolded || p.isAllIn || !inChipContest(p)) continue;
      return lastActions[i] != null;
    }
    return true;
  }
  // Lone actor who already matched (or posted) a live bet — street can close after they act
  // (handled above when contributed > cur without an action). Once acted, done.
  if (activeCount === 1) return actedCount >= 1;
  // Multi-way: every live seat must act this street (BB option after limps; check-around when cur === 0).
  return actedCount >= activeCount;
}

/** Seats that still have to act before this open betting street can close. */
export function playersHoldingBetting(state: GameState): number {
  if (state.phase !== 'betting' || state.round.isBettingOpen !== true) return 0
  if (chipContestantCount(state.players) < 2) return 0
  const cur = state.round.currentBet || 0
  const bets = state.round.playerBets || {}
  const lastActions = state.round.lastSeatBettingAction ?? []
  const active: number[] = []
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i]!
    if (p.hasFolded || p.isAllIn || !inChipContest(p)) continue
    active.push(i)
  }
  if (active.length === 0) return 0
  if (active.length === 1 && cur === 0) return lastActions[active[0]!] == null ? 1 : 0
  let holding = 0
  for (const i of active) {
    const p = state.players[i]!
    const contributed = bets[p.id] || 0
    const acted = lastActions[i] != null
    if (contributed < cur || (contributed === cur && !acted)) holding++
    else if (contributed > cur && active.length === 1 && !acted) holding++
  }
  return holding
}

/** No one left who can act — every chip-eligible player still in the hand is all-in (or folded). */
export function isAllInRunout(state: GameState): boolean {
  if (state.phase !== 'betting') return false;
  if (state.round.isBettingOpen === true) return false;

  let stillContesting = 0;
  let canAct = 0;
  for (const p of state.players) {
    if (p.hasFolded || !inChipContest(p)) continue;
    stillContesting++;
    if (!p.isAllIn) canAct++;
  }
  return stillContesting >= 2 && canAct === 0;
}

/** All-in runout with the five community cards out — phones may lock a guess before the host opens the clock. */
export function canPreloadTriviaAnswer(state: GameState): boolean {
  return isAllInRunout(state) && (state.round.communityCards?.length ?? 0) >= 5;
}

function boardReadyForGuess(state: GameState): boolean {
  const cards = state.round.communityCards
  return Array.isArray(cards) && cards.length >= 5
}

function seatIsOutOfTheBet(player: Pick<PlayerState, 'pointsOnly' | 'hasFolded' | 'isAllIn'>): boolean {
  if (!inChipContest(player)) return true
  if (player.hasFolded) return true
  return player.isAllIn === true
}

/** Answering is open, or the board is out and this seat is not still betting the pot. */
export function mayLockGuess(
  state: GameState,
  player: Pick<PlayerState, 'pointsOnly' | 'hasFolded' | 'isAllIn'> | null | undefined,
): boolean {
  if (state.phase === 'answering') return true
  if (state.phase !== 'betting' || player == null) return false
  if (!boardReadyForGuess(state)) return false
  return seatIsOutOfTheBet(player)
}

/**
 * When the action seat is folded, all-in, or off the roster, advance or close wagering so
 * CPU drains and venue lockstep do not stall with an open clock on a dead seat.
 */
export function normalizeBettingTurn(state: GameState): GameState {
  if (state.phase !== 'betting' || state.round.isBettingOpen !== true) return state;

  if (isBettingComplete(state)) {
    return {
      ...state,
      round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 },
    };
  }

  const rawIdx = state.round.currentPlayerIndex;
  const idx = typeof rawIdx === 'number' && Number.isFinite(rawIdx) ? Math.floor(rawIdx) : -1;
  if (idx >= 0 && idx < state.players.length) {
    const p = state.players[idx]!;
    if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return state;
  }

  const probeIdx = idx >= 0 ? idx : 0;
  const next = advanceToNextPlayer({
    ...state,
    round: { ...state.round, currentPlayerIndex: probeIdx },
  });
  if (next < 0) {
    return {
      ...state,
      round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 },
    };
  }
  return { ...state, round: { ...state.round, currentPlayerIndex: next } };
}

export function playerCheck(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  if ((state.round.currentBet || 0) > ((state.round.playerBets || {})[playerId] || 0)) return state; // cannot check facing a bet
  const nextIndex = advanceToNextPlayer(state);
  const nextState = {
    ...state,
    round: {
      ...state.round,
      currentPlayerIndex: nextIndex,
      ...seatActionRecord(state.round, state.players.length, seat, 'check'),
    },
  };
  return isBettingComplete(nextState) ? { ...nextState, round: { ...nextState.round, isBettingOpen: false, currentPlayerIndex: -1 } } : nextState;
}

export function playerCall(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  const toCall = amountToCall(state, playerId);
  if (toCall <= 0) return playerCheck(state, playerId);
  const callAmount = Math.min(toCall, state.players[seat].bankroll);
  let after = placeBet(state, playerId, callAmount);
  const nextIndex = advanceToNextPlayer(after);
  after = {
    ...after,
    round: {
      ...after.round,
      currentPlayerIndex: nextIndex,
      ...seatActionRecord(after.round, after.players.length, seat, 'call'),
    },
  };
  return isBettingComplete(after) ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } } : after;
}

/** Freeze further bets and raises. Calls, checks, and folds stay available. */
export function setRaisesClosed(state: GameState, closed: boolean): GameState {
  if ((state.round.raisesClosed === true) === closed) return state;
  return { ...state, round: { ...state.round, raisesClosed: closed } };
}

export function playerRaise(state: GameState, playerId: string, raiseAmount: number): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  if (state.round.raisesClosed === true) return state;
  if (raiseAmount <= 0) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  const toCall = amountToCall(state, playerId);
  const minRaise = minRaiseByAmount(state);
  if (raiseAmount < minRaise) return state;
  const prevBet = state.round.currentBet || 0;
  // Total contribution needed this action = toCall + raiseAmount
  const totalNeeded = toCall + raiseAmount;
  const contribution = Math.min(totalNeeded, state.players[seat].bankroll);
  let after = placeBet(state, playerId, contribution);
  // Update current bet to the player's total contributed if it exceeds current
  const contributedNow = (after.round.playerBets || {})[playerId] || 0;
  const newBet = Math.max(prevBet, contributedNow);
  const raiseSize = newBet - prevBet;
  // Full raise updates the street min; short all-in via raise path should not shrink it.
  const nextLastFull =
    raiseSize >= minRaise ? raiseSize : (after.round.lastFullRaiseAmount ?? minRaise);
  after = {
    ...after,
    round: {
      ...after.round,
      currentBet: newBet,
      lastFullRaiseAmount: nextLastFull,
    },
  };
  const nextIndex = advanceToNextPlayer(after);
  after = {
    ...after,
    round: {
      ...after.round,
      currentPlayerIndex: nextIndex,
      ...seatActionRecord(after.round, after.players.length, seat, 'raise'),
    },
  };
  return isBettingComplete(after)
    ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } }
    : after;
}

export function playerAllIn(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  const bankroll = state.players[seat].bankroll;
  if (bankroll <= 0) return state;
  if (state.round.raisesClosed === true) {
    const toCall = amountToCall(state, playerId);
    if (bankroll > toCall) return toCall > 0 ? playerCall(state, playerId) : playerCheck(state, playerId);
  }
  const prevBet = state.round.currentBet || 0;
  const minRaise = minRaiseByAmount(state);
  let after = placeBet(state, playerId, bankroll);
  // If this increased the player's contribution beyond current bet, update current bet
  const contributedNow = (after.round.playerBets || {})[playerId] || 0;
  const newBet = Math.max(prevBet, contributedNow);
  const raiseSize = newBet - prevBet;
  const nextLastFull =
    raiseSize >= minRaise ? raiseSize : (after.round.lastFullRaiseAmount ?? minRaise);
  after = {
    ...after,
    round: {
      ...after.round,
      currentBet: newBet,
      lastFullRaiseAmount: nextLastFull,
    },
  };
  const nextIndex = advanceToNextPlayer(after);
  after = {
    ...after,
    round: {
      ...after.round,
      currentPlayerIndex: nextIndex,
      ...seatActionRecord(after.round, after.players.length, seat, 'allIn'),
    },
  };
  return isBettingComplete(after) ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } } : after;
}

// Admin/host helpers
export function adminCloseBetting(state: GameState): GameState {
  if (state.phase !== 'betting') return state;
  return { ...state, round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 } };
}

export function adminAdvanceTurn(state: GameState): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const idx = state.round.currentPlayerIndex;
  if (typeof idx !== 'number' || idx < 0 || idx >= state.players.length) return state;
  const player = state.players[idx];
  if (!player) return state;
  return foldPlayer(state, player.id);
}

export function adminSetBlinds(state: GameState, smallBlind: number, bigBlind: number): GameState {
  const sb = Math.max(0, Math.floor(smallBlind));
  const bb = Math.max(sb, Math.floor(bigBlind));
  return { ...state, smallBlind: sb, bigBlind: bb };
}

export function foldPlayer(state: GameState, playerId: string): GameState {
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat >= 0 && state.players[seat]?.pointsOnly) return state;
  // Keep hole cards: fold exits the chip contest only; trivia answering still uses them.
  const updatedPlayers = state.players.map((player) =>
    player.id === playerId ? { ...player, hasFolded: true } : player,
  );
  // Advance turn if the folder was the one to act
  let nextIndex = state.round.currentPlayerIndex ?? -1;
  const folderIndex = getSeatIndexByPlayerId(state, playerId);
  if (folderIndex === state.round.currentPlayerIndex) {
    const tempState: GameState = { ...state, players: updatedPlayers } as GameState;
    nextIndex = advanceToNextPlayer(tempState);
  }
  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    round: {
      ...state.round,
      currentPlayerIndex: nextIndex,
      ...(folderIndex >= 0
        ? seatActionRecord(state.round, updatedPlayers.length, folderIndex, 'fold')
        : { lastSeatBettingAction: state.round.lastSeatBettingAction }),
    },
  };
  return isBettingComplete(newState) ? { ...newState, round: { ...newState.round, isBettingOpen: false, currentPlayerIndex: -1 } } : newState;
}

/** Nothing owed: check. A bet is owed: fold. The action a seat is forced into when it does not choose. */
export function forcedTurnAction(state: GameState, playerId: string): GameState {
  const contrib = state.round.playerBets?.[playerId] ?? 0;
  const toCall = Math.max(0, (state.round.currentBet || 0) - contrib);
  return toCall === 0 ? playerCheck(state, playerId) : foldPlayer(state, playerId);
}

export function submitAnswer(
  state: GameState,
  playerId: string,
  answer: number,
  composition?: readonly AnswerCardPick[]
): GameState {
  const seat = state.players.find((player) => player.id === playerId);
  if (seat?.answerForfeited === true) return state;
  const updatedPlayers = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          submittedAnswer: answer,
          answerComposition:
            composition != null && composition.length === PLAYER_ANSWER_DIGIT_CARD_COUNT
              ? composition
              : undefined,
        }
      : player
  );
  return { ...state, players: updatedPlayers };
}

/** After the nudge clock: seats that never locked a guess score 0 and cannot take the pot. */
export function forfeitOpenGuesses(state: GameState): GameState {
  if (state.phase !== 'answering') return state;
  let changed = false;
  const players = state.players.map((player) => {
    if (typeof player.submittedAnswer === 'number' && Number.isFinite(player.submittedAnswer)) return player;
    if (player.answerForfeited === true) return player;
    changed = true;
    return { ...player, answerForfeited: true };
  });
  return changed ? { ...state, players } : state;
}

/** Close the answer window. The server advances this straight into showdown. */
export function revealAnswer(state: GameState): GameState {
  if (state.phase !== 'answering') return state
  return { ...state, phase: 'reveal' }
}

/** Advance from the reveal beat into showdown (pot preview / closest guesses). */
export function advanceRevealToShowdown(state: GameState): GameState {
  if (state.phase !== 'reveal') return state
  return { ...state, phase: 'showdown' }
}

/** Trivia leaderboard: ties share the same `distance`; all IDs are joint winners for payout split. */
export function determineTriviaWinners(state: GameState): { winnerIds: string[]; distance: number } | null {
  const q = state.round.question;
  if (!q) return null;
  let bestDistance = Infinity;
  for (const player of state.players) {
    if (player.submittedAnswer === undefined) continue;
    const distance = Math.abs(player.submittedAnswer - q.answer);
    if (distance < bestDistance) bestDistance = distance;
  }
  if (bestDistance === Infinity) return null;
  const winnerIds = state.players
    .filter(
      (p) =>
        p.submittedAnswer !== undefined &&
        Math.abs(p.submittedAnswer - q.answer) === bestDistance
    )
    .map((p) => p.id);
  return winnerIds.length === 0 ? null : { winnerIds, distance: bestDistance };
}

/** Winners eligible to receive `{@link payoutPotSplitAmong}` this wave (closest answer among chip contestants only). */
export function determineChipPotTriviaWinners(state: GameState): { winnerIds: string[]; distance: number } | null {
  const eligible = state.players.filter((p) => inChipContest(p) && !p.hasFolded).map((p) => p.id);
  return determineChipPotTriviaWinnersAmong(state, eligible);
}

/** Closest trivia answer among a subset of seats (side-pot eligibility). */
export function determineChipPotTriviaWinnersAmong(
  state: GameState,
  eligiblePlayerIds: readonly string[]
): { winnerIds: string[]; distance: number } | null {
  const q = state.round.question;
  if (!q) return null;
  const eligible = new Set(eligiblePlayerIds);
  let bestDistance = Infinity;
  for (const player of state.players) {
    if (!eligible.has(player.id) || !inChipContest(player) || player.hasFolded || player.submittedAnswer === undefined)
      continue;
    const distance = Math.abs(player.submittedAnswer - q.answer);
    if (distance < bestDistance) bestDistance = distance;
  }
  if (bestDistance === Infinity) return null;
  const winnerIds = state.players
    .filter(
      (p) =>
        eligible.has(p.id) &&
        inChipContest(p) &&
        !p.hasFolded &&
        p.submittedAnswer !== undefined &&
        Math.abs(p.submittedAnswer - q.answer) === bestDistance,
    )
    .map((p) => p.id);
  return winnerIds.length === 0 ? null : { winnerIds, distance: bestDistance };
}

/** @deprecated Prefer determineTriviaWinners — this returns only the first tied seat in roster order. */
export function determineWinner(state: GameState): { winnerId: string; distance: number } | null {
  const tw = determineChipPotTriviaWinners(state);
  if (!tw || tw.winnerIds.length === 0) return null;
  return { winnerId: tw.winnerIds[0]!, distance: tw.distance };
}

/** Split `amount` from the table pot evenly in whole dollars; remainder $1 to earliest ids in `winnerIds`. */
export function payoutPotAmountAmong(state: GameState, winnerIds: string[], amount: number): GameState {
  const pay = Math.min(Math.max(0, Math.floor(amount)), state.round.pot);
  const ids = [...new Set(winnerIds)].filter((id) => {
    const p = state.players.find((x) => x.id === id);
    return p != null && inChipContest(p);
  });
  if (pay <= 0 || ids.length === 0) return state;
  const n = ids.length;
  const baseShare = Math.floor(pay / n);
  let remainder = pay - baseShare * n;
  const extraById = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const id = ids[i]!;
    const add = baseShare + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    extraById.set(id, (extraById.get(id) || 0) + add);
  }
  const players = state.players.map((p) => {
    const add = extraById.get(p.id);
    return add ? { ...p, bankroll: p.bankroll + add } : p;
  });
  return { ...state, round: { ...state.round, pot: state.round.pot - pay }, players };
}

/** Split whole pot evenly in whole dollars; remainder $1 chips go to earliest ids in `winnerIds`. */
export function payoutPotSplitAmong(state: GameState, winnerIds: string[]): GameState {
  return payoutPotAmountAmong(state, winnerIds, state.round.pot);
}

function chipSeat(state: GameState, id: string): PlayerState | undefined {
  const player = state.players.find((candidate) => candidate.id === id);
  return player != null && inChipContest(player) ? player : undefined;
}

/** No trivia winner: non-forfeited seats take the layer. If every seat missed the nudge, split it back. */
function unansweredPotRecipients(state: GameState, eligiblePlayerIds: readonly string[]): string[] {
  const alive: string[] = [];
  const seated: string[] = [];
  const forfeited: string[] = [];
  for (const id of eligiblePlayerIds) {
    const player = chipSeat(state, id);
    if (!player) continue;
    if (player.answerForfeited === true) {
      forfeited.push(id);
      continue;
    }
    seated.push(id);
    if (!player.hasFolded) alive.push(id);
  }
  if (alive.length > 0) return alive;
  if (seated.length > 0) return seated;
  return forfeited;
}

function payoutPotToEligibleSurvivors(state: GameState, eligiblePlayerIds: string[], amount: number): GameState {
  const trivia = determineChipPotTriviaWinnersAmong(state, eligiblePlayerIds);
  if (trivia && trivia.winnerIds.length > 0) {
    return payoutPotAmountAmong(state, trivia.winnerIds, amount);
  }
  const recipients = unansweredPotRecipients(state, eligiblePlayerIds);
  return recipients.length > 0 ? payoutPotAmountAmong(state, recipients, amount) : state;
}

/** Chips in the pot that only some of the players still in the hand can win. */
export function feltSidePotAmount(state: GameState): number | null {
  const contributions = state.round.handContributions ?? {}
  const { pots } = buildSidePotSettlement(contributions, foldedForSidePots(state, contributions))
  if (pots.length < 2) return null
  let side = 0
  for (let i = 1; i < pots.length; i++) side += pots[i]!.amount
  return side > 0 ? side : null
}

/** A contribution with no seat cannot win the pot. Their unmatched chips stay in it. */
function foldedForSidePots(state: GameState, contributions: Record<string, number>): Record<string, boolean> {
  const folded: Record<string, boolean> = {};
  for (const player of state.players) folded[player.id] = player.hasFolded;
  for (const id of Object.keys(contributions)) {
    if (folded[id] === undefined) folded[id] = true;
  }
  return folded;
}

/** Uncalled chips go back only when that player is still in the seat. */
function payReturnToSeatedPlayer(state: GameState, id: string, amount: number): GameState {
  if (amount <= 0 || !state.players.some((player) => player.id === id)) return state;
  const pay = Math.min(amount, state.round.pot);
  if (pay <= 0) return state;
  return {
    ...state,
    round: { ...state.round, pot: state.round.pot - pay },
    players: state.players.map((player) =>
      player.id === id ? { ...player, bankroll: player.bankroll + pay } : player,
    ),
  };
}

/** Chips nobody could be handed still belong to the players left in the hand. */
function awardPotStillOnTable(state: GameState): GameState {
  if (state.round.pot <= 0) return state;
  const live = state.players.filter((player) => inChipContest(player) && !player.hasFolded).map((player) => player.id);
  const ids = live.length > 0 ? live : state.players.filter((player) => inChipContest(player)).map((player) => player.id);
  if (ids.length === 0) return state;
  return payoutPotToEligibleSurvivors(state, ids, state.round.pot);
}

/** Pay the hand using side pots when {@link RoundState.handContributions} is present. */
export function payoutHandWithSidePots(state: GameState): GameState {
  const contributions = state.round.handContributions ?? {};
  const hasContribs = Object.values(contributions).some((v) => typeof v === 'number' && v > 0);
  if (!hasContribs) return payoutLegacySinglePot(state);

  const { pots, returns } = buildSidePotSettlement(contributions, foldedForSidePots(state, contributions));
  let s = state;
  for (const [id, amt] of Object.entries(returns)) s = payReturnToSeatedPlayer(s, id, amt);
  for (const pot of pots) {
    if (pot.amount > 0) s = payoutPotToEligibleSurvivors(s, pot.eligiblePlayerIds, pot.amount);
  }
  s = awardPotStillOnTable(s);
  return { ...s, round: { ...s.round, pot: 0 } };
}

/** Projected bankroll gain per player when {@link payoutHandWithSidePots} runs (showdown / reveal only). */
export function previewChipPayoutByPlayerId(state: GameState): Record<string, number> {
  if (state.phase !== 'showdown' && state.phase !== 'reveal') return {};
  const paid = payoutHandWithSidePots(state);
  const out: Record<string, number> = {};
  for (const p of state.players) {
    const next = paid.players.find((x) => x.id === p.id);
    if (next) out[p.id] = next.bankroll - p.bankroll;
  }
  return out;
}

function payoutLegacySinglePot(state: GameState): GameState {
  const pendingPot = state.round.pot;
  if (pendingPot <= 0) return { ...state, round: { ...state.round, pot: 0 } };

  const triviaChip = determineChipPotTriviaWinners(state);
  if (triviaChip && triviaChip.winnerIds.length > 0) {
    return payoutPotSplitAmong(state, triviaChip.winnerIds);
  }
  const recipients = unansweredPotRecipients(
    state,
    state.players.map((player) => player.id),
  );
  return recipients.length > 0
    ? payoutPotSplitAmong(state, recipients)
    : { ...state, round: { ...state.round, pot: 0 } };
}

export function payoutWinner(state: GameState, winnerId: string): GameState {
  return payoutPotSplitAmong(state, [winnerId]);
}

/**
 * Trivia points for one submitted guess (0–100): proportion of the correct magnitude.
 * Exact → 100; off by half the answer → 50; off by a full answer-size or more → 0.
 * Chip pot winners still use absolute distance (`determineTriviaWinners`).
 */
export function triviaAnswerPoints(submitted: number, correct: number): number {
  if (!Number.isFinite(submitted) || !Number.isFinite(correct)) return 0;
  if (nearlyEqualNumbers(correct, 0)) {
    return nearlyEqualNumbers(submitted, 0) ? 100 : 0;
  }
  const relativeError = Math.abs(submitted - correct) / Math.abs(correct);
  return roundTriviaPoints(100 * (1 - relativeError));
}

/** Nearest hundredth of a trivia point. Non-finite and negative totals become 0. */
export function roundTriviaPoints(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Number(value.toFixed(2));
}

/** Trivia points for screens: hundredths, thousands separators, whole numbers stay whole. */
export function formatTriviaPoints(value: number): string {
  return formatTriviaNumber(roundTriviaPoints(value));
}

export {
  ANSWER_REVEAL_BEFORE_WINNERS_MS,
  winnerScreensPayoutHint,
  winnerScreensReadyAt,
} from './winnerScreens';
export { answerRevealOpen, answerRevealWaitLabel } from './answerReveal';
export {
  advanceScoresWatch,
  emptyScoresWatch,
  noteScoresView,
  scoresCue,
  SCORES_FORCE_AFTER_HANDS,
} from './scoresWatch';
export type { ScoresWatch } from './scoresWatch';

function answerRoundPointsGained(snapshotPlayer: Pick<PlayerState, 'submittedAnswer'>, correct: number): number {
  if (snapshotPlayer.submittedAnswer === undefined) return 0;
  return triviaAnswerPoints(snapshotPlayer.submittedAnswer, correct);
}

/** Seats still in the chip contest. Points-only players stay at the table, but they do not hold the button. */
export function tableOccupants<T extends { pointsOnly?: boolean }>(players: readonly T[]): T[] {
  return players.filter((p) => p.pointsOnly !== true);
}

export function mergePointsStandings(
  prev: readonly PointsStanding[] | undefined,
  added: readonly PointsStanding[],
): PointsStanding[] {
  const byId = new Map<string, PointsStanding>();
  for (const row of prev ?? []) {
    if (row.id) byId.set(row.id, row);
  }
  for (const row of added) byId.set(row.id, row);
  return [...byId.values()];
}

/** Button for the next hand: the next chip stack after the old dealer. */
export function nextDealerOnOccupants(
  roster: readonly { pointsOnly?: boolean }[],
  dealerIndex: number,
): number {
  const n = roster.length
  if (n === 0) return 0
  for (let step = 1; step <= n; step++) {
    const idx = (dealerIndex + step) % n
    if (roster[idx]?.pointsOnly !== true) return idx
  }
  return 0
}

export function listPointsStandings(
  games: readonly { pointsStandings?: readonly PointsStanding[] | undefined }[],
): { name: string; answerPoints: number }[] {
  return mergePointsStandings(
    undefined,
    games.flatMap((g) => [...(g.pointsStandings ?? [])]),
  ).map((row) => ({ name: row.name, answerPoints: row.answerPoints }));
}

/** Run from showdown (or reveal if host skips the beat): pays pot, resets to lobby. Wrong phase → unchanged. */
export function endRound(state: GameState): GameState {
  if (state.phase !== 'showdown' && state.phase !== 'reveal') return state;

  const afterPayout = payoutHandWithSidePots(state);
  const snapById = new Map(state.players.map((p) => [p.id, p]));

  const q = state.round.question;
  const clearedPlayers: PlayerState[] = afterPayout.players.map((p) => {
    const snap = snapById.get(p.id);
    const gained = q != null && snap != null ? answerRoundPointsGained(snap, q.answer) : 0;
    const answerPoints = roundTriviaPoints((p.answerPoints ?? 0) + gained);
    const busted = p.bankroll <= 0;
    return {
      ...p,
      bankroll: busted ? 0 : p.bankroll,
      /** No stack after payout: stay seated and guess. Chips are over. */
      pointsOnly: busted || p.pointsOnly === true,
      answerPoints,
      hand: [],
      hasFolded: false,
      isAllIn: false,
      submittedAnswer: undefined,
      answerComposition: undefined,
      answerForfeited: undefined,
    };
  });

  const nextDealer = nextDealerOnOccupants(clearedPlayers, afterPayout.round.dealerIndex);

  return {
    ...afterPayout,
    phase: 'lobby',
    pointsStandings: state.pointsStandings,
    round: {
      roundId: nextRoundId(afterPayout.round.roundId),
      question: null,
      communityCards: [],
      pot: 0,
      dealerIndex: nextDealer,
      bettingRound: 1,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
      handContributions: {},
    },
    players: clearedPlayers,
  };
}

export {
  DISPLAY_PREVIEW_BANKROLLS,
  DISPLAY_PREVIEW_DEMO_QUESTION_ANSWER,
  DISPLAY_PREVIEW_DEMO_QUESTION_TEXT,
  DISPLAY_PREVIEW_NAMES,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_SYNCED_SUBTITLE,
  DISPLAY_PREVIEW_TABLES,
  buildDisplayPreviewGameState,
  normalizeDisplayPreviewTableNum,
  rehearsalSeatDisplayName,
  rehearsalSeatedCountForTable,
  rehearsalVenueTableRosterSizes,
} from './displayPreviewFixture'
export { VENUE_NUMBERED_TABLE_MAX, VENUE_WALL_SEAT_SLOTS } from './venueConstants'
export { balancedPhysicalSeats } from './balancedSeats'
export {
  VENUE_CONDENSE_MAX_SEATS,
  VENUE_CONDENSE_MIN_SEATS,
  VENUE_SHUFFLE_EVERY_HANDS,
  handsUntilVenueShuffle,
  isVenueShuffleHand,
  resolveVenueShuffleTick,
  countChipSurvivors,
  isChipSurvivor,
  mergeTargetTableCount,
  optimalVenueTableCount,
  nextBigBlindChipIndex,
  compactTableNumbers,
  planVenueCondense,
  seatingMoveByline,
  venueShuffleDisplayFields,
  type VenueCondenseMoveReason,
  type VenueCondensePlan,
  type VenueCondensePlayerMove,
  type VenueCondenseScheduledMerge,
  type VenueCondenseSoloMove,
  type VenueTableRoster,
} from './venueCondense'
export { adviseBlindCall, medianSeatedStack, type BlindCall, type BlindCallInput, type BlindCallVerb } from './blindCall'
export { disambiguatePublicNames, publicSeatInitials } from './publicSeatNames'
