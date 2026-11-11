export const HOW_TO_PLAY_QUESTION = 'How many minutes are in a day?'

export const HOW_TO_PLAY_BOARD = [3, 9, 9, 2, 7] as const

export const HOW_TO_PLAY_HOLES = [1, 4] as const

/** Five picks, in order. The decimal sits in front of the last digit: 1,439.9. */
export const HOW_TO_PLAY_ANSWER = [1, 4, 3, 9, 9] as const

export const HOW_TO_PLAY_DECIMAL_BEFORE = 4

export const HOW_TO_PLAY_SUBMITTED = '1,439.9'

export const HOW_TO_PLAY_CORRECT = '1,440'

export const HOW_TO_PLAY_SEGMENTS = ['Question', 'Your cards', 'Community', 'Your answer', 'Winner'] as const

export type HowToPlayCardFace = 'hidden' | 'shown' | 'selected' | 'dimmed'

export type HowToPlayPot = { label: string; amount: string }

type HoleShow = 'hidden' | 'shown' | 'selected'
type BoardShow = 'hidden' | 'shown' | 'picked'

export type HowToPlayStep = {
  segment: number
  eyebrow: string
  title: string
  description: string
  hint: string
  durationMs: number
  callout: string | null
  holes: HoleShow
  board: BoardShow
  answer: boolean
  pots: readonly HowToPlayPot[]
  outcome: boolean
}

const MAIN_POT: HowToPlayPot = { label: 'Main pot', amount: '$400' }
const SIDE_POT: HowToPlayPot = { label: 'Side pot', amount: '$200' }

export const HOW_TO_PLAY_STEPS: readonly HowToPlayStep[] = [
  {
    segment: 0,
    eyebrow: 'The question',
    title: 'Every round starts with a trivia question.',
    description:
      'Every question has a numeric answer. In this example, the table is working out how many minutes are in a day.',
    hint: 'Think about the answer before you see your cards.',
    durationMs: 6000,
    callout: null,
    holes: 'hidden',
    board: 'hidden',
    answer: false,
    pots: [],
    outcome: false,
  },
  {
    segment: 1,
    eyebrow: 'Your two cards',
    title: 'You start with two digit cards of your own.',
    description:
      'Only you can see these two cards. What you know about the answer, and how useful your digits look, both matter.',
    hint: 'Your cards are dealt before the first betting round.',
    durationMs: 6200,
    callout: null,
    holes: 'shown',
    board: 'hidden',
    answer: false,
    pots: [],
    outcome: false,
  },
  {
    segment: 1,
    eyebrow: 'First betting round',
    title: 'Check, call, raise, or fold.',
    description:
      'Nothing owed? Check. A bet is out? Call it, or raise. A raise has to be at least as big as the last one. You can fold and leave the chips. You can still answer for points.',
    hint: 'First decision, before the community cards.',
    durationMs: 7000,
    callout: 'Check, call, or raise',
    holes: 'shown',
    board: 'hidden',
    answer: false,
    pots: [],
    outcome: false,
  },
  {
    segment: 1,
    eyebrow: 'All-in',
    title: 'All-in puts your whole stack in the pot.',
    description:
      'Your whole stack goes in. You stay in for every pot those chips covered. Nobody can raise you off them, and you do not have to act again.',
    hint: 'This $400 is the whole stack. It becomes the main pot.',
    durationMs: 6500,
    callout: 'All-in',
    holes: 'shown',
    board: 'hidden',
    answer: false,
    pots: [MAIN_POT],
    outcome: false,
  },
  {
    segment: 2,
    eyebrow: 'The community cards',
    title: 'Five more digit cards are revealed to everyone.',
    description:
      'Everyone at the table shares these five cards. Together with your own two, that is seven digits to choose from.',
    hint: 'You may use any mix of your two cards and the five shared cards.',
    durationMs: 7000,
    callout: null,
    holes: 'shown',
    board: 'shown',
    answer: false,
    pots: [MAIN_POT],
    outcome: false,
  },
  {
    segment: 2,
    eyebrow: 'Second betting round',
    title: 'You can raise again once the board is out.',
    description:
      'Call, raise, or fold with all seven digits in view. A player who is already all-in stays in without putting in more.',
    hint: 'Second decision: raise or fold.',
    durationMs: 6500,
    callout: 'Raise or fold?',
    holes: 'shown',
    board: 'shown',
    answer: false,
    pots: [MAIN_POT],
    outcome: false,
  },
  {
    segment: 2,
    eyebrow: 'Side pot',
    title: 'A short all-in creates a side pot.',
    description:
      'Chips beyond what the shortest all-in could match become a side pot. Only the players who covered those extra chips can win it. The short stack can still win the main pot. A bet nobody called comes back.',
    hint: 'Main pot $400. Side pot $200, for the players who matched the larger bet.',
    durationMs: 8000,
    callout: null,
    holes: 'shown',
    board: 'shown',
    answer: false,
    pots: [MAIN_POT, SIDE_POT],
    outcome: false,
  },
  {
    segment: 3,
    eyebrow: 'Build your answer',
    title: 'Choose five cards and arrange them into your best answer.',
    description:
      'Use exactly five of the seven digits, in any order, and place one decimal if it helps. You submit the number on your phone.',
    hint: 'Here, 1, 4, 3, 9, and 9 become 1,439.9.',
    durationMs: 10500,
    callout: null,
    holes: 'selected',
    board: 'picked',
    answer: true,
    pots: [],
    outcome: false,
  },
  {
    segment: 4,
    eyebrow: 'The winner',
    title: 'Each pot goes to the closest answer that can win it.',
    description:
      'A day has 1,440 minutes. This answer is 1,439.9, one tenth away, so it takes the main pot. The side pot goes to the closest player who put in those extra chips.',
    hint: 'Closest still wins. A side pot has its own closest answer.',
    durationMs: 8000,
    callout: null,
    holes: 'selected',
    board: 'picked',
    answer: true,
    pots: [],
    outcome: true,
  },
]

export type HowToPlayFrame = {
  stepIndex: number
  stepCount: number
  stepLabel: string
  segment: number
  segmentLabel: string
  eyebrow: string
  title: string
  description: string
  hint: string
  question: string
  durationMs: number
  showCallout: boolean
  callout: string
  pots: readonly HowToPlayPot[]
  showOutcome: boolean
  answerRevealed: boolean
  answerDigits: readonly number[]
  decimalBefore: number
  submittedAnswer: string
  correctAnswer: string
  outcomeDetail: string
  holeDigits: readonly number[]
  boardDigits: readonly number[]
  holeFaces: readonly HowToPlayCardFace[]
  boardFaces: readonly HowToPlayCardFace[]
}

function wrapStep(stepIndex: number, count: number): number {
  const index = Math.floor(stepIndex)
  if (!Number.isFinite(index)) return 0
  return ((index % count) + count) % count
}

function holeFaces(show: HoleShow): HowToPlayCardFace[] {
  if (show === 'hidden') return ['hidden', 'hidden']
  if (show === 'selected') return ['selected', 'selected']
  return ['shown', 'shown']
}

function boardFaces(show: BoardShow): HowToPlayCardFace[] {
  if (show === 'hidden') return ['hidden', 'hidden', 'hidden', 'hidden', 'hidden']
  if (show === 'shown') return ['shown', 'shown', 'shown', 'shown', 'shown']
  return ['selected', 'selected', 'selected', 'dimmed', 'dimmed']
}

export function howToPlayFrame(stepIndex: number): HowToPlayFrame {
  const stepCount = HOW_TO_PLAY_STEPS.length
  const step = wrapStep(stepIndex, stepCount)
  const beat = HOW_TO_PLAY_STEPS[step]!
  return {
    stepIndex: step,
    stepCount,
    stepLabel: `Step ${step + 1} of ${stepCount}`,
    segment: beat.segment,
    segmentLabel: HOW_TO_PLAY_SEGMENTS[beat.segment] ?? HOW_TO_PLAY_SEGMENTS[0],
    eyebrow: beat.eyebrow,
    title: beat.title,
    description: beat.description,
    hint: beat.hint,
    question: HOW_TO_PLAY_QUESTION,
    durationMs: beat.durationMs,
    showCallout: beat.callout != null,
    callout: beat.callout ?? '',
    pots: beat.pots,
    showOutcome: beat.outcome,
    answerRevealed: beat.answer,
    answerDigits: HOW_TO_PLAY_ANSWER,
    decimalBefore: HOW_TO_PLAY_DECIMAL_BEFORE,
    submittedAnswer: HOW_TO_PLAY_SUBMITTED,
    correctAnswer: HOW_TO_PLAY_CORRECT,
    outcomeDetail: 'Just 0.1 away, so this answer takes the main pot. The side pot is a separate prize.',
    holeDigits: HOW_TO_PLAY_HOLES,
    boardDigits: HOW_TO_PLAY_BOARD,
    holeFaces: holeFaces(beat.holes),
    boardFaces: boardFaces(beat.board),
  }
}

export function howToPlayJoinUrl(origin: string, venueCode: string): string {
  const root = origin.trim().replace(/\/$/, '')
  if (!root) return ''
  const code = venueCode.trim().toUpperCase()
  const base = `${root}/player/`
  if (!code) return base
  return `${base}?room=${encodeURIComponent(code)}`
}

export function howToPlayQrSrc(joinUrl: string): string | null {
  if (!joinUrl.startsWith('http')) return null
  return `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=2&data=${encodeURIComponent(joinUrl)}`
}
