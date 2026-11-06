/** Cards on a felt are shown low to high. Ties keep the earlier source slot. */
export function cardsInDigitOrder<T extends { digit: number }>(
  cards: readonly T[],
): { card: T; index: number }[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => a.card.digit - b.card.digit || a.index - b.index)
}

export function digitsAscending(digits: readonly number[]): number[] {
  return cardsInDigitOrder(digits.map((digit) => ({ digit }))).map((item) => item.card.digit)
}
