import { z } from 'zod'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { GameState, Question, Setlist, SeatBettingAction } from '@qhe/core'

export type { GameState, Question, Setlist, SeatBettingAction }

/** Full venue library + active rundown playhead (host-only via `hostLibrary`). */
export type HostLibrarySnapshot = {
  questions: Question[]
  setlists: Setlist[]
  activeSetlistId: string | null
  activeSetlistNextIndex: number
  /** Default trivia answer countdown for this venue (seconds). Omitted by older servers. */
  answerWindowSeconds?: number
  /** Venue-wide blind schedule + current level. Omitted by older servers. */
  venueBlinds?: VenueBlindsSnapshot
}

/** Host library + venue wall: persisted blind levels for a venue. */
export type VenueBlindsSnapshot = {
  smallBlind: number
  bigBlind: number
  blindLevelIndex: number
  blindLevelCount: number
  handsPerBlindLevel: number
  handsAtCurrentLevel: number
  /** Null when at the top level in the schedule. */
  handsUntilNextLevel: number | null
  levels: { smallBlind: number; bigBlind: number }[]
}

export const ClientRole = z.enum(['host', 'player', 'display'])
export type ClientRole = z.infer<typeof ClientRole>

/** Host-driven `/display` mode: mosaic shell always; `focusTable` spotlights one felt or null for overview. */
export type VenueWallViewMode =
  | 'floor'
  | 'leaderboard'
  | 'leaderboard-trivia'
  | 'rules'
  | 'seating-chart'
  | 'busts'

const VENUE_WALL_VIEWS: readonly VenueWallViewMode[] = [
  'floor',
  'leaderboard',
  'leaderboard-trivia',
  'rules',
  'seating-chart',
  'busts',
]

export function isVenueWallView(value: unknown): value is VenueWallViewMode {
  return typeof value === 'string' && (VENUE_WALL_VIEWS as readonly string[]).includes(value)
}

export type DisplayLayoutPayload = {
  layout: 'venueWall'
  focusTable: number | null
  /** Host toggles between the table floor and full-screen stacks leaderboard. */
  wallView?: VenueWallViewMode
}

export function normalizeDisplayLayoutPayload(
  raw: Partial<DisplayLayoutPayload> | Record<string, unknown> | null | undefined
): DisplayLayoutPayload {
  const focusRaw = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).focusTable : null
  let focusTable: number | null = null
  if (focusRaw === null) focusTable = null
  else if (typeof focusRaw === 'number' && Number.isInteger(focusRaw) && focusRaw >= 1 && focusRaw <= VENUE_NUMBERED_TABLE_MAX) {
    focusTable = focusRaw
  }
  const wallViewRaw = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).wallView : undefined
  const wallView: VenueWallViewMode = isVenueWallView(wallViewRaw) ? wallViewRaw : 'floor'
  return { layout: 'venueWall', focusTable, wallView }
}

/** Lightweight venue context for player phones (mirrors display wall header fields). */
export type PlayerVenueBrief = {
  setlistCueNumber?: number | null
  setlistCueTotal?: number | null
  venueChipSurvivorCount?: number | null
  venueLiveTableCount?: number | null
  venueSmallBlind?: number | null
  venueBigBlind?: number | null
  blindLevelNumber?: number | null
  blindLevelCount?: number | null
  handsUntilNextBlindLevel?: number | null
  /** Hands until the next scheduled table shuffle; null at final table. */
  venueHandsUntilShuffle?: number | null
  /** Shuffle cadence (typically 5 venue-wide End Rounds). */
  venueShuffleEveryHands?: number | null
  /** Host froze phones, TVs, and the cue bar. */
  venueHeld?: boolean
  /** Next scheduled shuffle is postponed one cycle. */
  venueShuffleHeld?: boolean
}

/** Server `state` payload may include wire-only timing metadata. */
export type PlayerGameStateWire = GameState & {
  serverNowMs?: number
  /** Human roster seats currently connected (virtual players omitted / treated as online). */
  playerOnline?: Record<string, boolean>
}

/** Mosaic row for `/display` venue wall — derived live from numbered table sessions (1…N). */
export type DisplayVenueTileSnapshot = {
  tableNum: number
  seated: number
  pot: number
  phase: string
  /** Up to eight seat labels (vacant seats are empty strings), index matches player order on the felt. */
  seatNames: string[]
  /** Chip stacks per seat, parallel to `seatNames`; `0` when empty. Omitted by older servers. */
  seatBankrolls?: number[]
  /**
   * Blind roles on the venue mosaic (indexes into `seatNames`, same contiguous roster as core `players[]`).
   * Omitted by older servers; when present, nullable fields indicate no seated table / HU without SB.
   */
  dealerSeatIndex?: number | null
  smallBlindSeatIndex?: number | null
  bigBlindSeatIndex?: number | null
  /** Seat marker to pulse during open betting (same indexing as `seatNames`). Omitted by older servers. */
  actingSeatIndex?: number | null
  /** Betting: engine seat index to act (-1 encoded as null). Lets the venue wall recompute acting seat from live round state. */
  currentPlayerIndex?: number | null
  /** Betting: false when wagering is explicitly closed between streets. Null when unknown / older payloads. */
  isBettingOpen?: boolean | null
  /** 1 = pre-board, 2 = post-board. Omitted by older servers. */
  bettingRound?: number | null
  /** Effective SB/BB for this table (venue default or table override). Omitted by older servers. */
  smallBlind?: number
  bigBlind?: number
  /** True when this table uses custom blinds instead of the venue default. */
  blindsTableOverride?: boolean
  /** Parallel to `seatNames`: true when that roster seat has folded this hand. Omitted by older servers. */
  seatFolded?: boolean[]
  /** Parallel to `seatNames`: true when that seat is busted (points-only, no chip stack). Omitted by older servers. */
  seatPointsOnly?: boolean[]
  /** Parallel to `seatNames`: cumulative trivia answer points. Omitted by older servers. */
  seatAnswerPoints?: number[]
  /** This wagering street only: last check / call / raise / fold / all-in per seat. Omitted by older servers. */
  seatLastBettingAction?: (SeatBettingAction | null)[]
  /** Player to act: chips to call (min of facing amount and stack). Omitted when no one is up to wager. */
  actingCallAmount?: number | null
  /** Same player: % of current stack required for that call. Omitted when unknown or not applicable. */
  actingCallPctOfStack?: number | null
  /**
   * Heuristic cue for spotlighting active play (≥2 seated, open wagering or mid-hand trivia).
   * Omitted when false / older servers.
   */
  interestingAction?: boolean
  /**
   * Per physical seat (parallel `seatNames`): hole card digits once the hand is public
   * (reveal, showdown, payout). Omitted while the cards are still private.
   */
  seatHoleDigits?: (readonly [number, number] | null)[]
  /**
   * Per physical seat: a face-down pair is on the felt. Present before the digits
   * are public so the wall can draw card backs without the numbers.
   */
  seatHolesDealt?: boolean[]
  /** Community board digits for this table's current hand. Omitted when empty. */
  communityDigits?: number[]
  /** Trivia answer while this felt is in showdown / reveal (parallel `seatNames`). */
  showdownAnswer?: number | null
  /** Question text for mosaic / embedded hero during showdown. */
  showdownQuestionText?: string | null
  /**
   * Parallel to `seatNames` (physical 0..7): each seated player's trivia guess.
   * During `answering`, servers should omit numeric values (use {@link seatAnswerLocked} instead).
   * Null when folded or no submission. Present on reveal/showdown.
   */
  seatSubmittedAnswers?: (number | null)[]
  /** Parallel to `seatNames`: true when that seat has locked an answer (safe during answering). */
  seatAnswerLocked?: boolean[]
  /**
   * Parallel to `seatNames`: community board indices (0–4) each player used in their answer.
   * Omitted when unknown / older servers.
   */
  seatAnswerCommunityIndices?: (readonly number[] | null)[]
  /**
   * Parallel to `seatNames`: the five hole/community picks each player used to build their answer.
   * Authoritative from the game engine — display should prefer this over re-inferring composition.
   */
  seatAnswerCompositions?: (readonly { source: 'hole' | 'community'; index: number }[] | null)[]
  /**
   * Parallel to `seatNames`: projected chips won when the host ends the round (side pots + returns).
   * Omitted when not in showdown / reveal or older servers.
   */
  seatChipPayout?: (number | null)[]
}

/** Venue wall payload: table mosaic plus **shared trivia strip** keyed off the hottest trivia phase (prefer answering, then setup, etc.), not blindly table 1. */
export type DisplayVenueWallSnapshot = {
  tiles: DisplayVenueTileSnapshot[]
  /** Shared trivia headline: emitted from the current hand’s question through wagering, answering, and post-trivia phases while `round.question` is set. */
  headlineQuestionText: string | null
  /** Authoritative numeric answer for {@link headlineQuestionText} — same source as the headline felt’s `round.question.answer`. */
  headlineQuestionAnswer?: number | null
  /** Five card picks that compose {@link headlineQuestionAnswer} on the headline felt (when known). */
  headlineAnswerComposition?: readonly { source: 'hole' | 'community'; index: number }[] | null
  /** Server epoch ms when a trivia-visible felt is in `answering` with `answerDeadline`; cleared outside that window. */
  answerDeadlineMs: number | null
  /**
   * Venue-wide answering drama: how many seated players have locked a guess.
   * Safe to show on TV — never includes the numeric answers themselves.
   */
  answerSubmitCount?: number | null
  /** Seated players eligible to submit (all roster seats while answering). */
  answerEligibleCount?: number | null
  /** Numbered felt driving `headlineQuestionText` / `answerDeadlineMs` (lowest table in the hottest phase bucket). */
  headlineTableNum?: number | null
  /** Core phase of the headline felt when a shared strip is active. */
  headlinePhase?: string | null
  /** 1-based index of the active setlist cue when a rundown is loaded and a hand is in progress. */
  setlistCueNumber?: number | null
  /** Total cues in the active setlist (e.g. 25). */
  setlistCueTotal?: number | null
  /** Venue-wide blind amounts (lowest table override excluded — see per-tile fields). */
  venueSmallBlind?: number | null
  venueBigBlind?: number | null
  /** 1-based level index in the venue blind schedule. */
  blindLevelNumber?: number | null
  blindLevelCount?: number | null
  /** Hands remaining before the venue auto-advances to the next blind level; null at max level. */
  handsUntilNextBlindLevel?: number | null
  /**
   * Server epoch ms captured at the instant this snapshot was emitted.
   * The display uses (clientReceivedMs - serverNowMs) to cancel client-clock skew when rendering countdowns
   * — otherwise a client whose clock trails the server by 2–3s would see the 45-second timer start at 47–48.
   * Optional for backward compatibility with older servers.
   */
  serverNowMs?: number
  /** Humans in lobby pool (`LOBBY` session); 0 before anyone joins lobby. */
  lobbyPlayerCount: number
  /** Sum of seated humans across numbered tables. */
  totalSeatedAtTables: number
  /** Numbered felts with at least one chip survivor (condense display). */
  venueLiveTableCount?: number | null
  /** Seated field players (elimination only at endRound — bankroll can be $0 mid-hand). */
  venueChipSurvivorCount?: number | null
  /** Hands until the next scheduled table shuffle; null at final table. */
  venueHandsUntilShuffle?: number | null
  /** Shuffle cadence (typically 5 venue-wide End Rounds). */
  venueShuffleEveryHands?: number | null
  /** Host froze the room. TVs show "We'll resume". */
  venueHeld?: boolean
  /** Next scheduled shuffle is postponed one cycle. */
  venueShuffleHeld?: boolean
  /**
   * Public TV briefing: false after host **Assign from lobby** (or **Start Game** fallback for single-table flows),
   * mosaic tile phases, or local mosaic force.
   */
  showAudienceWelcome: boolean
  /** Server epoch ms — keep seating chart visible until this time after assign (even if play started). */
  seatingChartPinnedUntilMs?: number | null
  /** Players eliminated on the most recent paid hand (cleared when the next hand opens). */
  lastHandBusts?: DisplayVenueBustEntry[]
  /** Server epoch ms when that hand ended; pairs with {@link lastHandBusts} / {@link lastHandSeating}. */
  lastHandEndMs?: number | null
  /** Paid hands at this venue. Survives a server restart, unlike {@link lastHandEndMs}. */
  venueHandsCompleted?: number | null
  /** Table moves / closures / shuffle from the most recent End Round seating pass. */
  lastHandSeating?: DisplayVenueSeatingAnnouncement | null
}

/** Public display: one player moved tables after End Round. */
export type DisplayVenueSeatingMoveEntry = {
  name: string
  fromTableNum: number
  toTableNum: number
}

/** Public display: seating changes after End Round (solo rescue, closed felts, scheduled shuffle). */
export type DisplayVenueSeatingAnnouncement = {
  moves: DisplayVenueSeatingMoveEntry[]
  closedTableNums: number[]
  shuffled: boolean
  tablesBefore: number
  tablesAfter: number
  playerCount: number
}

/** Public display: one player busted on the last completed hand. */
export type DisplayVenueBustEntry = {
  name: string
  tableNum: number
}

/** Host-only (HOST:{venue}): numbered felts with “something happening now” spotlight cue. */
export type HostVenueGameplayHintsPayload = {
  livelyTableNums: number[]
}

/** Host-only: one row per numbered felt for lockstep alignment (updates with venue wall refresh). */
export type HostVenueFeltBeatRow = {
  tableNum: number
  /** False when no `VENUE:N` session exists yet. */
  active: boolean
  seated: number
  /** Core `phase`, or `inactive` when no session. */
  phase: string
  street: string
  clock: string
  answerDeadlineMs: number | null
  /**
   * Server lockstep fingerprint (`phaseStrictSignature`); `null` when inactive.
   * Host compares across active felts to flag drift.
   */
  phaseStrictSig: string | null
  /** Live trivia on this felt. Null between hands. */
  questionText?: string | null
  /** Host-only answer for {@link questionText}. */
  questionAnswer?: number | null
}

export type HostVenueFeltBeatPayload = {
  felts: HostVenueFeltBeatRow[]
}

export type HostVenueRecentAction = {
  seat: number
  name: string
  action: SeatBettingAction
}

/** Chronological player move for the host action log (all tables). */
export type HostVenueMoveLogKind =
  | SeatBettingAction
  | 'bet'
  | 'submit'

export type HostVenueMoveLogEntry = {
  /** Stable React key; unique within a venue session. */
  id: string
  atMs: number
  tableNum: number
  playerName: string
  kind: HostVenueMoveLogKind
  /** Full line without table prefix, e.g. "Jay W. raised to $40". */
  summary: string
}

/** Host-only: per-table action cue plus venue bust / big-win ledger. */
export type HostVenueActionRow = {
  tableNum: number
  phase: string
  seated: number
  pot: number
  interestingAction?: boolean
  actingSeatIndex: number | null
  actingPlayerName: string | null
  actingSummary: string | null
  recentActions: HostVenueRecentAction[]
  /** Seats still contesting the chip pot (not folded, not busted). */
  inPotCount: number
  /** Seats answering for trivia points only (folded and/or busted). */
  pointsOnlyCount: number
}

export type HostVenueBustEntry = {
  name: string
  tableNum: number
  atMs: number
}

export type HostVenueBigWinEntry = {
  name: string
  tableNum: number
  amount: number
  atMs: number
}

/** One raise, call, or all-in that committed at least the big-win chip bar. */
export type HostVenueBigBetEntry = {
  name: string
  tableNum: number
  amount: number
  kind: 'call' | 'raise' | 'allIn'
  atMs: number
}

export type HostVenueFloorBriefPayload = {
  actionRows: HostVenueActionRow[]
  /** Newest-first log of every player move across seated tables. */
  moveLog: HostVenueMoveLogEntry[]
  busts: HostVenueBustEntry[]
  bigWinners: HostVenueBigWinEntry[]
  /** Newest-first raises, calls, and all-ins at or above {@link bigWinMinAmount}. */
  bigBets: HostVenueBigBetEntry[]
  /** Largest-first calls, raises, and all-ins on the hand each table is playing now. */
  handBets: HostVenueBigBetEntry[]
  bigWinMinAmount: number
  fieldPlayerCount: number
  liveTableCount: number
  roster: { playerId: string; name: string; tableNum: number }[]
  venueHeld: boolean
  shuffleEveryHands: number
  venueShuffleHeld: boolean
  handsUntilShuffle: number | null
  /** Venue hands paid out. Zero until the first Pay winners. */
  handsCompleted?: number
  /** Median chip stack of seated players. Null when the floor is empty. */
  medianStack?: number | null
  /** Epoch ms when the first hand left the lobby. Null before the night starts. */
  showStartedAtMs?: number | null
  /** Largest seated field seen this night. */
  fieldPeakCount?: number
  /** Players eliminated on the hand that just paid. */
  lastHandBustCount?: number
}

export const ClientHello = z.object({
  role: ClientRole,
  name: z.string(),
  roomCode: z.string(),
  tableId: z.string().optional(),
  /** Host credential. Deployed servers reject a host hello when this does not match HOST_SECRET. */
  hostSecret: z.string().optional(),
  /** Display: URL / bootstrap hint when server has no persisted layout yet */
  displayVenueWall: z.boolean().optional(),
  /** Display: spotlight felt 1…{@link VENUE_NUMBERED_TABLE_MAX} for venue wall */
  displayFocusTable: z.number().int().min(1).max(VENUE_NUMBERED_TABLE_MAX).nullable().optional(),
  /** Display: pairing mode — no venue yet; server shows a short code for the host */
  displayAwaitPairing: z.boolean().optional(),
  /** Stable roster id from the player device — survives socket reconnect. */
  playerId: z.string().optional(),
})
export type ClientHello = z.infer<typeof ClientHello>

export const ServerAck = z.object({
  ok: z.boolean(),
  message: z.string(),
  playerId: z.string().optional(),
  restoredTableId: z.string().optional(),
})
export type ServerAck = z.infer<typeof ServerAck>

// Game Actions
export const StartGameAction = z.object({
  type: z.literal('startGame')
})
export type StartGameAction = z.infer<typeof StartGameAction>

export const SetQuestionAction = z.object({
  type: z.literal('setQuestion')
})
export type SetQuestionAction = z.infer<typeof SetQuestionAction>

export const DealCardsAction = z.object({
  type: z.literal('dealInitialCards').or(z.literal('dealCommunityCards'))
})
export type DealCardsAction = z.infer<typeof DealCardsAction>

export const BetAction = z.object({
  playerId: z.string(),
  amount: z.number()
})
export type BetAction = z.infer<typeof BetAction>

export const CheckAction = z.object({
  playerId: z.string()
})
export type CheckAction = z.infer<typeof CheckAction>

export const CallAction = z.object({
  playerId: z.string()
})
export type CallAction = z.infer<typeof CallAction>

export const RaiseAction = z.object({
  playerId: z.string(),
  amount: z.number()
})
export type RaiseAction = z.infer<typeof RaiseAction>

export const AllInAction = z.object({
  playerId: z.string()
})
export type AllInAction = z.infer<typeof AllInAction>

export const FoldAction = z.object({
  playerId: z.string()
})
export type FoldAction = z.infer<typeof FoldAction>

export const AnswerCardPick = z.object({
  source: z.enum(['hole', 'community']),
  index: z.number().int().min(0).max(4),
})

export const SubmitAnswerAction = z.object({
  playerId: z.string(),
  answer: z.number(),
  composition: z.array(AnswerCardPick).length(5).optional(),
})
export type SubmitAnswerAction = z.infer<typeof SubmitAnswerAction>

export const RevealAnswerAction = z.object({
  type: z.literal('revealAnswer')
})
export type RevealAnswerAction = z.infer<typeof RevealAnswerAction>

export const EndRoundAction = z.object({
  type: z.literal('endRound')
})
export type EndRoundAction = z.infer<typeof EndRoundAction>

export const NewGameAction = z.object({
  type: z.literal('newGame')
})
export type NewGameAction = z.infer<typeof NewGameAction>

export const StartAnsweringAction = z.object({
  type: z.literal('startAnswering')
})
export type StartAnsweringAction = z.infer<typeof StartAnsweringAction>

export type HostDisplayRoster = {
  displays: { socketId: string; name: string }[]
}

// Socket Events
export interface ServerToClientEvents {
  state: (state: GameState) => void
  toast: (message: string) => void
  ack: (ack: ServerAck) => void
  dealingCards: (payload?: { tableNum: number }) => void
  dealingCommunityCards: (payload?: { tableNum: number }) => void
  seated: (info: { tableId: string }) => void
  /** Host desk: server moved control to this table (e.g. after Assign) — sync ?table= UI. */
  hostBoundTable: (info: { tableId: string }) => void
  /** Sent only to sockets in HOST:{venue} — bank, setlists, active rundown */
  hostLibrary: (snapshot: HostLibrarySnapshot) => void
  /** Host cue: felts worth checking for public spotlight (cheap heuristic; updates with venue wall). */
  hostVenueGameplayHints: (payload: HostVenueGameplayHintsPayload) => void
  /** Host cue: structured 1–8 beat rows (updates with venue wall). */
  hostVenueFeltBeat: (payload: HostVenueFeltBeatPayload) => void
  /** Host cue: per-table action + bust / big-win ledger (updates with venue wall). */
  hostVenueFloorBrief: (payload: HostVenueFloorBriefPayload) => void
  /** Venue displays (DISPLAY:{venue}); host drives via displaySetLayout */
  displayLayout: (layout: DisplayLayoutPayload) => void
  /** Venue wall mosaic + current question / answer timer */
  displayVenueSnapshot: (payload: DisplayVenueWallSnapshot) => void
  /** Player phones: venue-wide blinds, cue, survivor counts (updates with venue wall). */
  playerVenueBrief: (payload: PlayerVenueBrief) => void
  /** Display pairing: TV shows this 4-character code until the host claims it */
  displayPairingCode: (payload: { code: string }) => void
  /** Pairing succeeded — UI should reconnect / promote as this venue display */
  displayVenueAssigned: (payload: { venueCode: string }) => void
  /** Host desk: TVs currently attached to this venue */
  hostDisplays: (payload: HostDisplayRoster) => void
  /** Display: host released this screen — return to the pairing code */
  displayReleased: () => void
}

export interface ClientToServerEvents {
  hello: (data: ClientHello) => void
  action: (data: { type: string; payload?: any }) => void
}

// Host admin actions
/** Beats a host can force onto one table. Ids match `phaseStrictSignature`. */
export const TABLE_PHASE_OVERRIDES = [
  { id: 'lobby', label: 'Waiting room' },
  { id: 'question', label: 'Deal / question' },
  { id: 'bet|1|T|cc0', label: 'Betting, clock open' },
  { id: 'bet|1|F|cc0', label: 'Betting, clock closed' },
  { id: 'bet|2|T|cc5', label: 'Board out, betting open' },
  { id: 'bet|2|F|cc5', label: 'Board out, betting closed' },
  { id: 'answer', label: 'Guessing' },
  { id: 'postHand', label: 'Results' },
] as const

export type TablePhaseOverrideId = (typeof TABLE_PHASE_OVERRIDES)[number]['id']

export const AdminCloseBettingAction = z.object({ type: z.literal('adminCloseBetting') })
export type AdminCloseBettingAction = z.infer<typeof AdminCloseBettingAction>

export const AdminAdvanceTurnAction = z.object({ type: z.literal('adminAdvanceTurn') })
export type AdminAdvanceTurnAction = z.infer<typeof AdminAdvanceTurnAction>

export const AdminAdvanceTurnVenueAction = z.object({ type: z.literal('adminAdvanceTurnVenue') })
export type AdminAdvanceTurnVenueAction = z.infer<typeof AdminAdvanceTurnVenueAction>

/** Host: 30s countdown on acting humans, then auto check/fold. */
export const NudgeActingPlayersAction = z.object({ type: z.literal('nudgeActingPlayers') })
export type NudgeActingPlayersAction = z.infer<typeof NudgeActingPlayersAction>

export const AdminSetBlindsAction = z.object({
  type: z.literal('adminSetBlinds'),
  smallBlind: z.number(),
  bigBlind: z.number()
})
export type AdminSetBlindsAction = z.infer<typeof AdminSetBlindsAction>

export type InterServerEvents = Record<string, never>;
export type SocketData = { role: ClientRole; name: string; room: string; userId: string };

// Re-export client utilities
export * from './client';
