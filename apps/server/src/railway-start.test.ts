import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const railwayToml = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'railway.toml'),
  'utf8',
)

describe('railway start', () => {
  it('starts node directly and leaves time to exit 0 on redeploy', () => {
    const start = railwayToml.match(/^startCommand\s*=\s*"(.*)"/m)?.[1]
    expect(start).toBe('node apps/server/dist/index.js')
    expect(start ?? '').not.toMatch(/^npm\b/)
    expect(railwayToml).toMatch(/^drainingSeconds\s*=\s*10\s*$/m)
  })
})
