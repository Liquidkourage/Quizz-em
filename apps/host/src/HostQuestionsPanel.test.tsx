import { createEmptyGame } from '@qhe/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostQuestionsPanel, type HostQuestionsPanelProps } from './HostQuestionsPanel'

function markup(overrides: Partial<HostQuestionsPanelProps> = {}) {
  const props: HostQuestionsPanelProps = {
    gameState: createEmptyGame('HOST01', 'host', 'LOBBY'),
    questionBank: [],
    setlists: [{ id: 'sl-1', name: 'Friday night', questionIds: ['a', 'b', 'c', 'd'] }],
    activeSetlistId: null,
    activeSetlistNextIndex: 0,
    onActivateSetlist: () => {},
    setlistDraftId: null,
    setSetlistDraftId: () => {},
    qbText: '',
    setQbText: () => {},
    qbAnswer: '',
    setQbAnswer: () => {},
    qbCategory: '',
    setQbCategory: () => {},
    qbDifficulty: '',
    setQbDifficulty: () => {},
    editingBankId: null,
    importFileRef: { current: null },
    importReplaceRef: { current: false },
    onImportError: () => {},
    handleSaveBankQuestion: (e) => e.preventDefault(),
    resetQuestionDraft: () => {},
    startEditBankQuestion: () => {},
    appendQuestionToSetlist: () => {},
    moveSetlistQuestion: () => {},
    removeSetlistQuestion: () => {},
    shuffleSetlistQuestions: () => {},
    handlePushBankQuestion: () => {},
    ...overrides,
  }
  return renderToStaticMarkup(<HostQuestionsPanel {...props} />)
}

describe('setlist cards', () => {
  it('puts Use on Live on the card, next to Manage', () => {
    const html = markup()
    expect(html).toContain('Friday night')
    expect(html).toContain('Use on Live')
    expect(html).toContain('Manage')
  })

  it('shows the live cue on the card that is already active', () => {
    const html = markup({ activeSetlistId: 'sl-1', activeSetlistNextIndex: 1 })
    expect(html).toContain('On Live · cue 2 of 4')
  })
})
