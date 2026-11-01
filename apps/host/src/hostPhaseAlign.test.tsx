import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { HostFloorStrip } from './hostDeskLayout'

function row(tableNum: number, phase: string, sig: string): HostVenueFeltBeatRow {
  return {
    tableNum,
    active: true,
    seated: 3,
    phase,
    street: '',
    clock: '',
    answerDeadlineMs: null,
    phaseStrictSig: sig,
  }
}

describe('HostFloorStrip phase tools', () => {
  it('offers match and set-phase when tables disagree', () => {
    const html = renderToStaticMarkup(
      createElement(HostFloorStrip, {
        rows: [row(1, 'answering', 'answer'), row(2, 'showdown', 'postHand')],
        brief: null,
        onSpotlight: () => {},
        onAlignRoom: () => {},
        onSetTablePhase: () => {},
      }),
    )
    expect(html).toContain('Match the room')
    expect(html).toContain('Set phase')
    expect(html).toContain('Guessing')
    expect(html).toContain('Results')
  })
})
