import { createEmptyGame } from '@qhe/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HostDeskShell } from './HostDeskShell'
import { HostLivePanel } from './HostLivePanel'
import { HostLiveQuestionCard, HostVenueFeltBeatStrip } from './hostDeskLayout'
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
        feltBeat={
          <HostVenueFeltBeatStrip
            rows={[
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
            hostTableId="1"
            onSetTablePhase={() => {}}
          />
        }
        floorNow={<section>Venue floor · now</section>}
        onGoPreShow={() => {}}
      />,
    )
    expect(html).toContain('Deal the cards')
    expect(html).toContain('Audience TVs')
    expect(html).toContain('Venue felts · beat')
    expect(html).toContain('grid-cols-3')
    expect(html).toContain('host-open-button')
    expect(html).toContain('Open')
    expect(html).not.toContain('Click a table to set its phase')
    expect(html).toContain('Venue floor · now')
    expect(html).toContain('Right now')
    expect(html).toContain('Pay winners')
    expect(html).not.toContain('Chip scores')
    expect(html).toContain('host-live-board')
    expect(html).toContain('sm:grid-cols-2')
    expect(html).toContain('sm:col-span-2')
    expect(html).toContain('sm:row-start-4')
    expect(html).toContain('max-h-full self-start')
    expect(html).not.toContain('h-full min-h-0 overflow-hidden sm:col-span-2')
    expect(html).not.toContain('sm:col-start-1 sm:row-start-3')
    const beat = html.indexOf('Venue felts · beat')
    const now = html.indexOf('Venue floor · now')
    const hand = html.indexOf('Right now')
    expect(hand).toBeGreaterThan(beat)
    expect(now).toBeGreaterThan(hand)
  })

  it('leaves the answer clock on the page and the table buttons in a popup', () => {
    const html = renderToStaticMarkup(
      <HostLivePanel
        gameState={createEmptyGame('HOST01', 'host', '1')}
        phaseDockItems={[]}
        runOfShowHeadline={{ title: 'Reveal the answer' }}
        pacingUrgency="now"
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
            phase: 'answering',
            street: 'board',
            clock: '',
            answerDeadlineMs: Date.now() + 20_000,
            phaseStrictSig: 'answer',
          },
        ]}
        venueFloorBrief={null}
        onSpotlight={() => {}}
        handShow={false}
        handBody={null}
        feltBeat={<section>Venue felts · beat</section>}
        floorNow={<section>Venue floor · now</section>}
        onGoPreShow={() => {}}
      />,
    )
    expect(html).toContain('Answer clock')
    expect(html).not.toContain('text-6xl')
    expect(html).toContain('w-24 shrink-0')
    expect(html).toContain('sm:col-span-2 sm:row-start-2')
    expect(html).toContain('text-2xl font-bold')
    expect(html).not.toContain('Show table 1 large on the TVs')
  })

  it('sets the live question larger than the compact clock', () => {
    const html = renderToStaticMarkup(
      <HostLiveQuestionCard text="How long was the mission?" answer={195} />,
    )
    expect(html).toContain('text-2xl font-semibold')
    expect(html).toContain('text-4xl font-extrabold')
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
