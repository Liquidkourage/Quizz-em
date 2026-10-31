import { describe, expect, it } from 'vitest'
import { buildHealthReport } from './health'

const base = { uptimeMs: 125_000, rssBytes: 150 * 1024 * 1024, nodeVersion: 'v22.0.0' }

describe('buildHealthReport', () => {
  it('reports ok with zero counts when no games exist', () => {
    const report = buildHealthReport({ ...base, rooms: new Map() })
    expect(report).toMatchObject({ status: 'ok', rooms: 0, venues: 0, players: 0 })
  })

  it('counts rooms, distinct venues and seated players', () => {
    const rooms = new Map([
      ['V:1', { code: 'V', players: [{}, {}, {}] }],
      ['V:2', { code: 'V', players: [{}, {}] }],
      ['W:1', { code: 'W', players: [{}] }],
    ])
    const report = buildHealthReport({ ...base, rooms })
    expect(report).toMatchObject({ rooms: 3, venues: 2, players: 6 })
  })

  it('reports uptime in whole seconds and memory in megabytes', () => {
    const report = buildHealthReport({ ...base, rooms: new Map() })
    expect(report.uptimeSec).toBe(125)
    expect(report.memoryMb).toBe(150)
  })

  it('names the database mode from DATABASE_URL', () => {
    expect(buildHealthReport({ ...base, rooms: new Map(), databaseUrl: 'postgres://x' }).persistence).toBe('postgres')
    expect(buildHealthReport({ ...base, rooms: new Map(), databaseUrl: '  ' }).persistence).toBe('sqlite')
    expect(buildHealthReport({ ...base, rooms: new Map() }).persistence).toBe('sqlite')
  })

  it('does not expose venue codes, room keys or the database URL', () => {
    const rooms = new Map([['SECRET:1', { code: 'SECRET', players: [{}] }]])
    const text = JSON.stringify(buildHealthReport({ ...base, rooms, databaseUrl: 'postgres://user:pw@host/db' }))
    expect(text).not.toContain('SECRET')
    expect(text).not.toContain('pw')
  })
})
