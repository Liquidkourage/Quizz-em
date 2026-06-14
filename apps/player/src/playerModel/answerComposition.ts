import type { AnswerCardPick, GameState, NumericCard, PlayerState } from '@qhe/core'

export const ANSWER_CARD_COUNT = 5

export type SelectedCardRef = { type: 'hand' | 'community'; index: number }

export type ComposedAnswer = {
  digits: (number | 'decimal')[]
  display: string
  value: number
}

export const EMPTY_COMPOSED_ANSWER: ComposedAnswer = { digits: [], display: '', value: 0 }

export function cardDigitAt(
  gameState: GameState,
  currentPlayer: PlayerState | undefined,
  ref: SelectedCardRef
): number | null {
  if (ref.type === 'hand') {
    const card = currentPlayer?.hand[ref.index] as NumericCard | undefined
    return card?.digit ?? null
  }
  const card = gameState.round.communityCards[ref.index] as NumericCard | undefined
  return card?.digit ?? null
}

export function rebuildComposedFromSelection(
  gameState: GameState,
  currentPlayer: PlayerState | undefined,
  selected: SelectedCardRef[]
): ComposedAnswer {
  const digits: number[] = []
  for (const ref of selected) {
    const d = cardDigitAt(gameState, currentPlayer, ref)
    if (d != null) digits.push(d)
  }
  const display = digits.map((d) => d.toString()).join('')
  return { digits, display, value: parseFloat(display) || 0 }
}

export function toggleCardInSelection(args: {
  gameState: GameState
  currentPlayer: PlayerState | undefined
  selected: SelectedCardRef[]
  composed: ComposedAnswer
  type: 'hand' | 'community'
  index: number
}): { selected: SelectedCardRef[]; composed: ComposedAnswer; error?: string } {
  const { gameState, currentPlayer, selected, composed, type, index } = args
  const existing = selected.findIndex((sc) => sc.type === type && sc.index === index)
  if (existing >= 0) {
    const nextSelected = selected.filter((_, i) => i !== existing)
    return {
      selected: nextSelected,
      composed: rebuildComposedFromSelection(gameState, currentPlayer, nextSelected),
    }
  }

  if (selected.length >= ANSWER_CARD_COUNT) {
    return {
      selected,
      composed,
      error: `Your answer uses exactly ${ANSWER_CARD_COUNT} cards — tap a selected card to remove it, or clear.`,
    }
  }

  const digit = cardDigitAt(gameState, currentPlayer, { type, index })
  if (digit == null) return { selected, composed }

  const nextSelected = [...selected, { type, index }]
  const nextDigits = [...composed.digits, digit]
  const display = nextDigits.map((d) => (d === 'decimal' ? '.' : String(d))).join('')
  return {
    selected: nextSelected,
    composed: {
      digits: nextDigits,
      display,
      value: parseFloat(display.replace(/\.$/, '')) || 0,
    },
  }
}

export function toggleDecimal(composed: ComposedAnswer): ComposedAnswer {
  if (composed.display.includes('.')) {
    const newDisplay = composed.display.replace('.', '')
    const newDigits = composed.digits.filter((d) => d !== 'decimal')
    return { digits: newDigits, display: newDisplay, value: parseFloat(newDisplay) || 0 }
  }
  return {
    digits: [...composed.digits, 'decimal'],
    display: composed.display + '.',
    value: parseFloat(composed.display + '.') || 0,
  }
}

export function selectionToComposition(selected: SelectedCardRef[]): AnswerCardPick[] {
  return selected.map((sc) => ({
    source: sc.type === 'hand' ? ('hole' as const) : ('community' as const),
    index: sc.index,
  }))
}

export function validateAnswerSubmit(
  phase: string,
  selected: SelectedCardRef[],
  composed: ComposedAnswer
): string | null {
  if (phase !== 'answering') return 'Answering is not open yet.'
  if (selected.length !== ANSWER_CARD_COUNT) {
    return `Select exactly ${ANSWER_CARD_COUNT} digit cards to build your answer.`
  }
  if (!composed.display.trim() || !Number.isFinite(composed.value)) {
    return 'Compose a valid number from your five cards before submitting.'
  }
  return null
}

export function boardHiddenDuringBetting(gameState: GameState): boolean {
  const wageringRound = gameState.round.bettingRound ?? 0
  return (
    gameState.phase === 'betting' &&
    wageringRound === 1 &&
    gameState.round.communityCards.length === 0
  )
}
