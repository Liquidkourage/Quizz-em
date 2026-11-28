import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueBlindChange, {
  BLIND_CHANGE_MS,
  blindChangeFromPayload,
  blindColumnLag,
  blindDigitCells,
  blindHeadline,
  blindPhaseAt,
  blindStageClass,
  blindPreviewNotice,
  blindPreviewOffset,
  questionYieldsToBlinds,
} from './VenueBlindChange'

describe('VenueBlindChange', () => {
  it('reads a blind change off the wall snapshot', () => {
    expect(blindChangeFromPayload({ smallBlind: 15, bigBlind: 30, atMs: 5 })).toEqual({
      smallBlind: 15,
      bigBlind: 30,
      atMs: 5,
    })
    expect(blindChangeFromPayload(null)).toBeNull()
    expect(blindChangeFromPayload({ smallBlind: 0, bigBlind: 30, atMs: 5 })).toBeNull()
    expect(
      blindChangeFromPayload({
        smallBlind: 20,
        bigBlind: 40,
        previousSmallBlind: 10,
        previousBigBlind: 20,
        atMs: 9,
      }),
    ).toEqual({
      smallBlind: 20,
      bigBlind: 40,
      previousSmallBlind: 10,
      previousBigBlind: 20,
      atMs: 9,
    })
  })

  it('shows the current level when no earlier blinds are known', () => {
    const html = renderToStaticMarkup(
      createElement(VenueBlindChange, { notice: { smallBlind: 15, bigBlind: 30, atMs: 5 } }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('NEW BLINDS')
    expect(html).toContain('Small blind')
    expect(html).toContain('Big blind')
    expect(html).toContain('>1<')
    expect(html).toContain('>5<')
    expect(html).toContain('>3<')
    expect(html).toContain('>0<')
    expect(html).not.toContain('BLINDS INCREASING')
    expect(html).not.toContain('blind-flap')
  })

  it('opens on the old amounts and flips only the digits that change', () => {
    expect(blindDigitCells(100, 200)).toEqual([
      { old: '1', next: '2' },
      { old: '0', next: '0' },
      { old: '0', next: '0' },
    ])
    expect(blindDigitCells(150, 200).map((cell) => `${cell.old}${cell.next}`).join(' ')).toBe('12 50 00')
    expect(blindDigitCells(500, 1000).map((cell) => cell.next).join('')).toBe('1000')
    expect(blindDigitCells(1000, 2000).map((cell) => cell.old).join('')).toBe('1000')

    const html = renderToStaticMarkup(
      createElement(VenueBlindChange, {
        notice: {
          smallBlind: 200,
          bigBlind: 400,
          previousSmallBlind: 100,
          previousBigBlind: 200,
          atMs: 9,
        },
      }),
    )
    expect(html).toContain('aria-label="BLINDS INCREASING"')
    expect(html).toContain('blind-letter')
    expect(html).toContain('Quizz')
    expect(html).toContain('>1<')
    expect(html).toContain('>2<')
    expect(html).not.toContain('>4<')
    expect(html).toContain('blind-digit')
    expect(html).not.toContain('blind-flap')
    expect(html).toContain('blind-chips')
    expect(html).toContain('blind-chip')
    expect(html).toContain('data-lag="120"')
    expect(blindColumnLag('small')).toBe(0)
    expect(blindColumnLag('big')).toBe(120)
  })

  it('reads a development preview without a live tournament', () => {
    expect(blindPreviewNotice('?blindPreview=100,200,200,400')).toEqual({
      previousSmallBlind: 100,
      previousBigBlind: 200,
      smallBlind: 200,
      bigBlind: 400,
      atMs: 1,
    })
    expect(blindPreviewNotice('?blindPreview=150,300,200,400')?.smallBlind).toBe(200)
    expect(blindPreviewNotice('?blindPreview=500,1000,1000,2000')?.previousBigBlind).toBe(1000)
    expect(blindPreviewNotice('?blindPreview=1000,2000,2000,4000')?.bigBlind).toBe(4000)
    expect(blindPreviewNotice('')).toBeNull()
    expect(blindPreviewNotice('?blindPreview=0,200,200,400')).toBeNull()
    expect(blindPreviewNotice('?blindPreview=100,200')).toBeNull()
    expect(blindPreviewOffset('?blindAt=950')).toBe(950)
    expect(blindPreviewOffset('')).toBeNull()
    expect(BLIND_CHANGE_MS).toBe(3500)
    expect(blindPhaseAt(400)).toBe('hold')
    expect(blindPhaseAt(680)).toBe('hold')
    expect(blindPhaseAt(800)).toBe('flip')
    expect(blindPhaseAt(1400)).toBe('rise')
    expect(blindPhaseAt(1900)).toBe('sweep')
    expect(blindPhaseAt(2300)).toBe('confirm')
    expect(blindHeadline('hold', true)).toBe('BLINDS INCREASING')
    expect(blindHeadline('confirm', true)).toBe('NEW BLINDS')
    expect(blindStageClass('rise', false)).toContain('rise')
    expect(blindStageClass('confirm', true)).toContain('frozen')
  })

  it('keeps the question off the screen until the blinds announcement is finished', () => {
    expect(questionYieldsToBlinds(true, 5, null)).toBe(true)
    expect(questionYieldsToBlinds(true, 5, 5)).toBe(false)
    expect(questionYieldsToBlinds(false, 5, null)).toBe(false)
  })
})
