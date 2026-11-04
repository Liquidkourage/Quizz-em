import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function underlineCount(digit: 6 | 9): number {
  const svg = readFileSync(new URL(`./assets/card-faces/digit-${digit}.svg`, import.meta.url), 'utf8')
  return svg.split('data-digit-underline').length - 1
}

describe('card digit underlines', () => {
  it('marks a six and a nine so a turned card still reads', () => {
    expect(underlineCount(6)).toBe(3)
    expect(underlineCount(9)).toBe(3)
  })
})
