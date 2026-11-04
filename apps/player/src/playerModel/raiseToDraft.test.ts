import { describe, expect, it } from 'vitest'
import { raiseToDraft } from './raiseToDraft'

describe('raise to draft', () => {
  it('keeps a deleted digit on screen', () => {
    expect(raiseToDraft('4', 20, 20, 500)).toEqual({ text: '4', raiseBy: null })
    expect(raiseToDraft('', 20, 20, 500)).toEqual({ text: '', raiseBy: null })
  })

  it('keeps an added digit and commits it once the total is a legal raise', () => {
    expect(raiseToDraft('400', 20, 20, 500)).toEqual({ text: '400', raiseBy: 380 })
    expect(raiseToDraft('80', 20, 20, 500)).toEqual({ text: '80', raiseBy: 60 })
  })

  it('shows a total above the stack without committing it', () => {
    expect(raiseToDraft('9000', 20, 20, 500)).toEqual({ text: '9000', raiseBy: null })
  })
})
