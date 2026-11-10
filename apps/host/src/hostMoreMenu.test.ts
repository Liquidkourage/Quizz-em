import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const more = app.slice(app.indexOf('const moreMenu'), app.indexOf('</HostMoreMenu>'))

describe('host More menu', () => {
  it('drops the leftover tools and keeps the room controls and mosaic strip', () => {
    expect(more).toContain('HostMosaicPreviewPanel')
    expect(more).toContain('HostPlayerPhasePreviewPanel')
    expect(more).not.toContain('Nudge acting')
    expect(more).not.toContain('Fold acting player')
    expect(more).not.toContain('Close betting')
    expect(more).not.toContain('Host view table')
    expect(more).not.toContain('showTableOverride')
    expect(more).toContain('HostRoomControls')
    expect(more).toContain('New game')
    expect(more).toContain('Practice bots')
    expect(more).toContain('HostConnectedDisplays')
  })
})
