import fs from 'fs'
import path from 'path'
import { dataFile } from './data-dir'

export type VenuePlayhead = { setlistId: string | null; nextIndex: number }

export function venuePlayheadFile(env: NodeJS.ProcessEnv = process.env): string {
  return dataFile('venue-playhead.json', env)
}

function parsePlayhead(raw: unknown): VenuePlayhead | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as { setlistId?: unknown; nextIndex?: unknown }
  if (row.setlistId !== null && typeof row.setlistId !== 'string') return null
  const nextIndex = Math.floor(Number(row.nextIndex))
  if (!Number.isFinite(nextIndex) || nextIndex < 0) return null
  return { setlistId: row.setlistId, nextIndex }
}

export function readVenuePlayheads(file: string): Map<string, VenuePlayhead> {
  const out = new Map<string, VenuePlayhead>()
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return out
  }
  if (!parsed || typeof parsed !== 'object') return out
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const vn = key.trim().toUpperCase()
    const ph = parsePlayhead(value)
    if (vn && ph) out.set(vn, ph)
  }
  return out
}

export function writeVenuePlayheads(file: string, map: Map<string, VenuePlayhead>): void {
  const obj: Record<string, VenuePlayhead> = {}
  for (const [key, ph] of map) {
    const vn = key.trim().toUpperCase()
    if (!vn) continue
    obj[vn] = { setlistId: ph.setlistId, nextIndex: Math.max(0, Math.floor(ph.nextIndex)) }
  }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
  } catch (error) {
    console.error('Failed to persist venue playhead:', error)
  }
}
