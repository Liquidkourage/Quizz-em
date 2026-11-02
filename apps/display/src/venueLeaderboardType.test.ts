import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

/** Third argument of the font-size clamp for one exact rule. */
function clampMax(selector: string): string {
  const at = css.indexOf(`${selector} {`)
  const slice = css.slice(at, at + 280)
  const match = slice.match(/font-size:\s*clamp\([^,]+,[^,]+,\s*([^)]+)\)/)
  return match?.[1]?.trim() ?? ''
}

describe('leaderboard row ceilings', () => {
  it('uses the empty space already in each row', () => {
    expect(clampMax('\n  .venue-lb-row-rank')).toBe('1.625rem')
    expect(clampMax('\n  .venue-lb-row-name')).toBe('1.875rem')
    expect(clampMax('\n  .venue-lb-row-stack')).toBe('1.875rem')
    expect(clampMax('.venue-lb-viewport--full-field .venue-lb-row-rank')).toBe('1.625rem')
    expect(clampMax('.venue-lb-viewport--full-field .venue-lb-row-name')).toBe('1.875rem')
    expect(clampMax('.venue-lb-viewport--full-field .venue-lb-row-stack')).toBe('1.875rem')
    expect(clampMax('.venue-lb-viewport--full-field .venue-lb-row-rank-top')).toBe('1.875rem')
    expect(clampMax('.venue-lb-viewport--full-field .venue-lb-row-name-top')).toBe('1.875rem')
    expect(clampMax('.venue-lb-viewport--full-field .venue-lb-row-stack-top')).toBe('2rem')
  })
})
