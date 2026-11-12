import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PLAYER_PHASE_PREVIEWS, type PlayerPhasePreviewId } from '@qhe/core'
import { PREVIEW_QUESTION } from '../playerPhaseFixture'
import { PlayerPhasePreview } from './PlayerPhasePreview'

const LANDMARKS: Record<PlayerPhasePreviewId, string> = {
  join: 'Join the game',
  connecting: 'Syncing with the venue',
  waiting: 'waiting to be seated',
  table: 'The host will deal when ready',
  question: PREVIEW_QUESTION,
  turn: 'Your turn',
  guess: 'Submit answer',
  'guess-locked': 'Submitted',
  folded: 'Folded',
  results: 'Table results',
  between: 'waiting for the next question',
  'game-over': 'Game over',
}

describe('player phase preview', () => {
  it('shows each phone picture from join through the end of the night', () => {
    for (const scene of PLAYER_PHASE_PREVIEWS) {
      const html = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: scene.id }))
      expect(html.includes(LANDMARKS[scene.id]), scene.show).toBe(true)
    }
    const folded = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'folded' }))
    expect(folded).toContain(PREVIEW_QUESTION)
    expect(folded).toContain('player-bet-reserve')
    const between = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'between' }))
    expect(between).toContain('Table results')
    expect(between).toContain('Stack')
    const results = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'results' }))
    expect(results).not.toContain('waiting for the next question')
  })

  it('reserves the betting area during a hand so the table stays the turn size', () => {
    const question = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'question' }))
    expect(question).toContain('player-game-layout--with-dock')
    expect(question).toContain('player-bet-reserve')
    expect(question).toContain('aria-hidden="true"')
    const turn = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'turn' }))
    expect(turn).toContain('player-game-layout--with-dock')
    expect(turn).not.toContain('player-bet-reserve')
    expect(turn).toContain('Your turn')
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    expect(css).toContain('.player-bet-reserve')
    expect(css).toContain('visibility: hidden')
  })

  it('puts the scores beside the results only on a short sideways phone', () => {
    const between = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'between' }))
    const splitAt = between.indexOf('player-between-split')
    const split = between.slice(splitAt, between.indexOf('player-game-felt', splitAt))
    expect(splitAt).toBeGreaterThan(-1)
    expect(split).toContain('Stack')
    expect(split).toContain('Table results')
    const results = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'results' }))
    expect(results).not.toContain('player-between-split')

    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const baseAt = css.indexOf('.player-between-split {')
    expect(css.slice(baseAt, baseAt + 80)).toContain('display: contents')
    const shortAt = css.indexOf('Short sideways between-hands')
    const short = shortAt < 0 ? '' : css.slice(shortAt, shortAt + 1400)
    expect(short).toContain('@media (orientation: landscape) and (max-height: 520px) and (min-width: 28rem)')
    expect(short).toContain('flex-direction: row')
    expect(short).toContain('flex: 0 0 6.75rem')
    expect(short).toContain('grid-template-columns: 1fr;')
  })
})
