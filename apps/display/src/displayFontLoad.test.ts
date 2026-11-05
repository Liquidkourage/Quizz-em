import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('display font load', () => {
  it('paints the public page without waiting on Google Fonts', () => {
    const css = readFileSync(join(appRoot, 'src/index.css'), 'utf8')
    const html = readFileSync(join(appRoot, 'index.html'), 'utf8')
    expect(css.includes('fonts.googleapis.com')).toBe(false)
    expect(html.includes('media="print"')).toBe(true)
    expect(html.includes('fonts.googleapis.com')).toBe(true)
  })
})
