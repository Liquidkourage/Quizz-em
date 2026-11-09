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

export type HowToPlayStep = {
  segment: number
  eyebrow: string
  title: string
  description: string
  hint: string
  durationMs: number
}

export const HOW_TO_PLAY_STEPS: readonly HowToPlayStep[] = [
  {
    segment: 0,
    eyebrow: 'The question',
    title: 'Every round starts with a trivia question.',
    description:
      'Every question has a numeric answer. In this example, the table is working out how many minutes are in a day.',
    hint: 'Think about the answer before you see your cards.',
    durationMs: 6000,
  },
  {
    segment: 1,
    eyebrow: 'Your two cards',
    title: 'You start with two digit cards of your own.',
    description:
      'Only you can see these two cards. What you know about the answer, and how useful your digits look, both matter.',
    hint: 'Your cards are dealt before the first betting round.',
    durationMs: 6200,
  },
  {
    segment: 1,
    eyebrow: 'First betting round',
    title: 'Now you decide whether to bet or fold.',
    description:
      'Stay in by betting, or fold if you would rather sit this question out. Folding leaves the pot. You can still answer for points.',
    hint: 'First decision: bet or fold.',
    durationMs: 5400,
  },
  {
    segment: 2,
    eyebrow: 'The community cards',
    title: 'Five more digit cards are revealed to everyone.',
    description:
      'Everyone at the table shares these five cards. Together with your own two, that is seven digits to choose from.',
    hint: 'You may use any mix of your two cards and the five shared cards.',
    durationMs: 7000,
  },
  {
    segment: 2,
    eyebrow: 'Second betting round',
    title: 'You get one more chance to bet or fold.',
    description:
      'All seven digits are out. Decide whether to stay in before anyone submits a number.',
    hint: 'Second decision: bet or fold.',
    durationMs: 5200,
  },
  {
    segment: 3,
    eyebrow: 'Build your answer',
    title: 'Choose five cards and arrange them into your best answer.',
    description:
      'Use exactly five of the seven digits, in any order, and place one decimal if it helps. You submit the number on your phone.',
    hint: 'Here, 1, 4, 3, 9, and 9 become 1,439.9.',
    durationMs: 10500,
  },
  {
    segment: 4,
    eyebrow: 'The winner',
    title: 'Whoever gets closest to the correct answer wins the pot.',
    description:
      'A day has 1,440 minutes. This answer is 1,439.9, one tenth away. At this table, that is the closest.',
    hint: 'It pays to know the answer. You still have to play the cards.',
    durationMs: 7200,
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

function holeFaces(step: number): HowToPlayCardFace[] {
  if (step < 1) return ['hidden', 'hidden']
  if (step >= 5) return ['selected', 'selected']
  return ['shown', 'shown']
}

function boardFaces(step: number): HowToPlayCardFace[] {
  if (step < 3) return ['hidden', 'hidden', 'hidden', 'hidden', 'hidden']
  if (step < 5) return ['shown', 'shown', 'shown', 'shown', 'shown']
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
    showCallout: step === 2 || step === 4,
    callout: 'Bet or fold?',
    showOutcome: step === stepCount - 1,
    answerRevealed: step >= 5,
    answerDigits: HOW_TO_PLAY_ANSWER,
    decimalBefore: HOW_TO_PLAY_DECIMAL_BEFORE,
    submittedAnswer: HOW_TO_PLAY_SUBMITTED,
    correctAnswer: HOW_TO_PLAY_CORRECT,
    outcomeDetail: 'Just 0.1 away. This is the closest answer at the table.',
    holeDigits: HOW_TO_PLAY_HOLES,
    boardDigits: HOW_TO_PLAY_BOARD,
    holeFaces: holeFaces(step),
    boardFaces: boardFaces(step),
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
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&data=${encodeURIComponent(joinUrl)}`
}
