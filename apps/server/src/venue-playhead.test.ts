import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readVenuePlayheads, writeVenuePlayheads, type VenuePlayhead } from './venue-playhead'

describe('venue playhead file', () => {
  it('remembers which question is next, including a cleared list', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'qhe-playhead-')), 'venue-playhead.json')
    const saved = new Map<string, VenuePlayhead>([
      ['SHOW', { setlistId: 'night', nextIndex: 4 }],
      ['FREE', { setlistId: null, nextIndex: 0 }],
    ])
    writeVenuePlayheads(file, saved)
    expect(readVenuePlayheads(file)).toEqual(saved)
  })
})
