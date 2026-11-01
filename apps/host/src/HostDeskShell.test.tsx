import { createEmptyGame } from '@qhe/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostDeskShell } from './HostDeskShell'
import { HostLivePanel } from './HostLivePanel'
import { HostQuestionsPanel, type HostQuestionsPanelProps } from './HostQuestionsPanel'

describe('host desk viewport', () => {
  it('locks the desk to the screen and keeps the stage inside it', () => {
    const html = renderToStaticMarkup(
      <HostDeskShell header={<nav>Pre-show</nav>}>
        <p>Live cues</p>
      </HostDeskShell>,
    )
    expect(html).toContain('Pre-show')
    expect(html).toContain('Live cues')
    expect(html).toContain('h-full')
    expect(html).toContain('max-h-full')
    expect(html).toContain('overflow-hidden')
    expect(html).toContain('host-desk-stage')
  })

  it('fits Live in the stage, with Beat, Now, and the hand sharing the remaining height', () => {
    const html = renderToStaticMarkup(
      <HostLivePanel
        gameState={createEmptyGame('HOST01', 'host', 'LOBBY')}
        phaseDockItems={[]}
        runOfShowHeadline={{ title: 'Deal the cards' }}
        pacingUrgency="ready"
        runBarCueHint={null}
        onVenueFloor={() => {}}
        onLeaderboard={() => {}}
        onTriviaLeaderboard={() => {}}
        onSeatingRules={() => {}}
        venueFeltBeat={[
          {
            tableNum: 1,
            active: true,
            seated: 2,
            phase: 'betting',
            street: 'preflop',
            clock: '',
            answerDeadlineMs: null,
            phaseStrictSig: 'betting',
          },
        ]}
        venueFloorBrief={null}
        onSpotlight={() => {}}
        handShow
        handBody={<p>Pay winners</p>}
        feltBeat={<section>Venue felts · beat</section>}
        floorNow={<section>Venue floor · now</section>}
        onGoPreShow={() => {}}
      />,
    )
    expect(html).toContain('Deal the cards')
    expect(html).toContain('Venue felts · beat')
    expect(html).toContain('Venue floor · now')
    expect(html).toContain('Pay winners')
    expect(html).toContain('grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)]')
    expect(html).not.toContain('max-h-36')
    expect(html).toContain('host-next-band')
    const beat = html.indexOf('Venue felts · beat')
    const now = html.indexOf('Venue floor · now')
    const hand = html.indexOf('Right now')
    expect(now).toBeGreaterThan(beat)
    expect(hand).toBeGreaterThan(now)
  })
})

function questionsMarkup() {
  const props: HostQuestionsPanelProps = {
    gameState: createEmptyGame('HOST01', 'host', 'LOBBY'),
    questionBank: [],
    setlists: [],
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
  }
  return renderToStaticMarkup(<HostQuestionsPanel {...props} />)
}

describe('questions library viewport', () => {
  it('fills the stage and scrolls the library inside the panel', () => {
    const html = questionsMarkup()
    expect(html).toContain('h-full')
    expect(html).toContain('overflow-hidden')
    expect(html).toContain('overflow-y-auto')
  })
})
