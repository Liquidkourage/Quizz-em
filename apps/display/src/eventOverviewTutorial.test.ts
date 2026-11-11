import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EventOverviewWall from './EventOverviewWall'
import { EVENT_OVERVIEW_STEPS, eventOverviewFrame, eventSeatFace } from './eventOverviewTutorial'

describe('event overview', () => {
  it('plays seven stages and loops', () => {
    expect(EVENT_OVERVIEW_STEPS).toHaveLength(7)
    expect(eventOverviewFrame(0).stepLabel).toBe('STEP 1 OF 7')
    expect(eventOverviewFrame(6).remaining).toBe(1)
    expect(eventOverviewFrame(6).accuracy).toBe(21)
    expect(eventOverviewFrame(7).stepIndex).toBe(0)
    expect(eventOverviewFrame(-1).stepIndex).toBe(6)
  })

  it('keeps busted players on the accuracy board and adds a late arrival', () => {
    const busted = eventOverviewFrame(3)
    expect(busted.remaining).toBe(10)
    expect(busted.accuracy).toBe(18)
    expect(busted.ranks[0]).toEqual({ name: 'Player 4', status: 'No chips; still playing', special: true })
    const late = eventOverviewFrame(4)
    expect(late.accuracy).toBe(21)
    expect(late.ranks.map((row) => row.name)).toContain('Player 20')
  })

  it('leaves one poker winner while everyone stays on the accuracy board', () => {
    const frame = eventOverviewFrame(6)
    expect(frame.tables).toBe(1)
    expect(frame.tableName).toBe('FINAL TABLE')
    expect(frame.emptyTables).toEqual([true, true, false])
    expect(eventSeatFace(2, 2, 6)).toEqual({ label: '8', kind: 'winner' })
    expect(eventSeatFace(2, 0, 6).kind).toBe('bust')
    expect(frame.accuracy).toBe(21)
  })

  it('draws the event lesson with the real join note and no controls on the TV', () => {
    const html = renderToStaticMarkup(
      createElement(EventOverviewWall, { step: 0, venueCode: 'AB12' }),
    )
    expect(html).toContain('How the Event Works')
    expect(html).toContain('There are two ways to compete')
    expect(html).toContain('18')
    expect(html).toContain('players with chips')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('placeholder')
  })
})
