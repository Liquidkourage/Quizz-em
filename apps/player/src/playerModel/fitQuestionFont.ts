export type QuestionFontBox = {
  height: number
  width: number
}

/** Largest type size whose measured box still fits. Shrinks when the question is too long. */
export function largestFittingFontPx(
  measure: (fontPx: number) => QuestionFontBox,
  maxHeight: number,
  maxWidth: number,
  maxFontPx: number,
  minFontPx: number,
): number {
  if (!(maxHeight > 0) || !(maxWidth > 0)) return minFontPx
  const ceiling = Math.max(maxFontPx, minFontPx)
  let lo = minFontPx
  let hi = ceiling
  let best = minFontPx

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2
    const box = measure(mid)
    if (box.height <= maxHeight + 1 && box.width <= maxWidth + 1) {
      best = mid
      lo = mid
    } else {
      hi = mid
    }
  }

  return best
}

const MIN_QUESTION_FONT_PX = 13
const MAX_QUESTION_FONT_PX = 72

function questionFitBudget(
  host: HTMLElement,
  text: HTMLElement,
): { maxHeight: number; maxWidth: number } | null {
  const style = getComputedStyle(host)
  const pad = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
  const label = host.querySelector('.player-sticky-question-label')
  const labelH = label instanceof HTMLElement ? label.offsetHeight + 8 : 0
  let maxHeight = host.clientHeight - pad - labelH
  if (style.maxHeight.endsWith('px')) {
    const cap = parseFloat(style.maxHeight)
    if (cap > 0 && cap < 4000) maxHeight = cap - pad - labelH
  }
  const maxWidth = text.clientWidth
  if (!(maxHeight > 8) || !(maxWidth > 8)) return null
  return { maxHeight, maxWidth }
}

/** Size the portrait question so the full wording fits its box. */
export function fitStickyQuestion(host: HTMLElement, text: HTMLElement): void {
  const budget = questionFitBudget(host, text)
  if (!budget) return
  const fitted = largestFittingFontPx(
    (fontPx) => {
      text.style.fontSize = `${fontPx}px`
      return { height: text.scrollHeight, width: text.scrollWidth }
    },
    budget.maxHeight,
    budget.maxWidth,
    Math.min(MAX_QUESTION_FONT_PX, Math.max(budget.maxHeight * 0.9, MIN_QUESTION_FONT_PX)),
    MIN_QUESTION_FONT_PX,
  )
  text.style.fontSize = `${fitted}px`
}
