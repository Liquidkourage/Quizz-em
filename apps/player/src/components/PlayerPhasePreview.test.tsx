import { createElement } from 'react'
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
    expect(folded).not.toContain('Your turn')
    const between = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'between' }))
    expect(between).toContain('Table results')
    expect(between).toContain('Stack')
    const results = renderToStaticMarkup(createElement(PlayerPhasePreview, { scene: 'results' }))
    expect(results).not.toContain('waiting for the next question')
  })
})
