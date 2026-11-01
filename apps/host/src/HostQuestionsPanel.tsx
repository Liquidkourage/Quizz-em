import { type FormEvent, type ReactNode, type RefObject, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NeonButton } from '@qhe/ui'
import { formatTriviaNumber, VENUE_QUESTION_SET_LENGTH, formatSetlistProgress, isSetlistTargetLength, type GameState, type Question } from '@qhe/core'
import {
  questionBankDelete,
  questionBankRestoreSamples,
  questionBankImportRows,
  setlistCreate,
  setlistSave,
  setlistDelete,
} from '@qhe/net'
import { HostCollapsible } from './hostDeskLayout'
import { parseQuestionsCsv, parseQuestionsJson } from './questionImport'

type SetlistRow = { id: string; name: string; questionIds: string[] }
type LibraryView = 'setlists' | 'questions'

export type HostQuestionsPanelProps = {
  gameState: GameState
  questionBank: Question[]
  setlists: SetlistRow[]
  activeSetlistId: string | null
  activeSetlistNextIndex: number
  onActivateSetlist: (id: string) => void
  setlistDraftId: string | null
  setSetlistDraftId: (id: string | null) => void
  qbText: string
  setQbText: (v: string) => void
  qbAnswer: string
  setQbAnswer: (v: string) => void
  qbCategory: string
  setQbCategory: (v: string) => void
  qbDifficulty: string
  setQbDifficulty: (v: string) => void
  editingBankId: string | null
  importFileRef: RefObject<HTMLInputElement | null>
  importReplaceRef: { current: boolean }
  onImportError: (msg: string) => void
  handleSaveBankQuestion: (e: FormEvent) => void
  resetQuestionDraft: () => void
  startEditBankQuestion: (q: Question) => void
  appendQuestionToSetlist: (setlistId: string, questionId: string) => void
  moveSetlistQuestion: (setlistId: string, index: number, dir: 'up' | 'down') => void
  removeSetlistQuestion: (setlistId: string, index: number) => void
  shuffleSetlistQuestions: (setlistId: string) => void
  handlePushBankQuestion: (questionId: string) => void
}

const fieldClass =
  'mt-1 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-white placeholder:text-white/35'

const modalClosers: Array<() => void> = []
let modalOverflowRestore: string | null = null

function HostModal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const close = () => onCloseRef.current()
    if (modalClosers.length === 0) {
      modalOverflowRestore = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    modalClosers.push(close)
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (modalClosers[modalClosers.length - 1] !== close) return
      e.preventDefault()
      close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const index = modalClosers.lastIndexOf(close)
      if (index >= 0) modalClosers.splice(index, 1)
      if (modalClosers.length === 0 && modalOverflowRestore != null) {
        document.body.style.overflow = modalOverflowRestore
        modalOverflowRestore = null
      }
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 sm:py-12"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto flex max-h-[min(85vh,52rem)] w-full flex-col rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button type="button" className="text-sm font-semibold text-white/55 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function setlistLiveActionLabel(isActive: boolean, nextIndex: number, questionCount: number): string {
  if (!isActive) return 'Use on Live'
  if (questionCount > 0 && nextIndex >= questionCount) return 'On Live · finished'
  return `On Live · cue ${nextIndex + 1} of ${questionCount}`
}

function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

export function HostQuestionsPanel(p: HostQuestionsPanelProps) {
  const {
    gameState, questionBank, setlists, activeSetlistId, activeSetlistNextIndex, onActivateSetlist,
    setlistDraftId, setSetlistDraftId, qbText, setQbText, qbAnswer, setQbAnswer, qbCategory, setQbCategory,
    qbDifficulty, setQbDifficulty, editingBankId, importFileRef, importReplaceRef, onImportError,
    handleSaveBankQuestion, resetQuestionDraft, startEditBankQuestion, appendQuestionToSetlist,
    moveSetlistQuestion, removeSetlistQuestion, shuffleSetlistQuestions, handlePushBankQuestion,
  } = p

  const [view, setView] = useState<LibraryView>('setlists')
  const [search, setSearch] = useState('')
  const [creatingSetlist, setCreatingSetlist] = useState(false)
  const [newSetlistName, setNewSetlistName] = useState('')
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [addQuery, setAddQuery] = useState('')
  const [addCueOpen, setAddCueOpen] = useState(false)
  const [creatingForSetlistId, setCreatingForSetlistId] = useState<string | null>(null)
  const [addTarget, setAddTarget] = useState<Question | null>(null)
  const [pendingDelete, setPendingDelete] = useState<
    { kind: 'setlist'; id: string; name: string } | { kind: 'question'; id: string; name: string } | null
  >(null)
  const pendingCreate = useRef<{ name: string; knownIds: Set<string> } | null>(null)
  const pendingQuestionAppend = useRef<{
    setlistId: string
    text: string
    answer: number
    knownIds: Set<string>
  } | null>(null)

  const draft = setlistDraftId != null ? setlists.find((s) => s.id === setlistDraftId) : undefined

  useEffect(() => {
    if (editingBankId) {
      setView('questions')
      setCreateQuestionOpen(true)
    }
  }, [editingBankId])

  useEffect(() => {
    setRenameDraft(draft?.name ?? '')
  }, [draft?.id, draft?.name])

  useEffect(() => {
    const pending = pendingCreate.current
    if (!pending) return
    const fresh = setlists.find((s) => s.name === pending.name && !pending.knownIds.has(s.id))
    if (!fresh) return
    pendingCreate.current = null
    setSetlistDraftId(fresh.id)
  }, [setlists, setSetlistDraftId])

  useEffect(() => {
    const pending = pendingQuestionAppend.current
    if (!pending) return
    const fresh = questionBank.find(
      (q) => !pending.knownIds.has(q.id) && q.text === pending.text && q.answer === pending.answer,
    )
    if (!fresh) return
    pendingQuestionAppend.current = null
    appendQuestionToSetlist(pending.setlistId, fresh.id)
  }, [questionBank, appendQuestionToSetlist])

  const filteredSetlists = useMemo(
    () => setlists.filter((sl) => matchesQuery(`${sl.name} ${sl.questionIds.length}`, search)),
    [setlists, search],
  )

  const filteredQuestions = useMemo(
    () =>
      questionBank.filter((q) =>
        matchesQuery(`${q.text} ${q.answer} ${q.category ?? ''} ${q.difficulty ?? ''}`, search),
      ),
    [questionBank, search],
  )

  function openCreateQuestion() {
    resetQuestionDraft()
    setCreatingForSetlistId(null)
    setCreateQuestionOpen(true)
    setView('questions')
  }

  function openAddNewToSetlist(setlistId: string) {
    resetQuestionDraft()
    setCreatingForSetlistId(setlistId)
    setCreateQuestionOpen(true)
  }

  function closeQuestionForm() {
    resetQuestionDraft()
    setCreateQuestionOpen(false)
    setCreatingForSetlistId(null)
  }

  function submitQuestion(e: FormEvent) {
    const text = qbText.trim()
    const answer = Number(qbAnswer)
    if (!text || Number.isNaN(answer)) {
      handleSaveBankQuestion(e)
      return
    }
    if (!editingBankId && creatingForSetlistId) {
      pendingQuestionAppend.current = {
        setlistId: creatingForSetlistId,
        text,
        answer,
        knownIds: new Set(questionBank.map((q) => q.id)),
      }
    }
    handleSaveBankQuestion(e)
    setCreateQuestionOpen(false)
    setCreatingForSetlistId(null)
  }

  function createSetlist() {
    const name = newSetlistName.trim()
    if (!name) return
    pendingCreate.current = { name, knownIds: new Set(setlists.map((s) => s.id)) }
    setlistCreate(name)
    setNewSetlistName('')
    setCreatingSetlist(false)
  }

  function duplicateSetlist(sl: SetlistRow) {
    setlistCreate(`${sl.name} copy`, sl.questionIds)
  }

  function confirmPendingDelete() {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'setlist') {
      setlistDelete(pendingDelete.id)
      if (setlistDraftId === pendingDelete.id) setSetlistDraftId(null)
    } else {
      questionBankDelete(pendingDelete.id)
    }
    setPendingDelete(null)
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-xl border border-white/10 bg-black/25 p-1" role="tablist" aria-label="Library">
          {(['setlists', 'questions'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold capitalize ${
                view === id ? 'bg-white/14 text-white ring-1 ring-casino-emerald/35' : 'text-white/55 hover:text-white'
              }`}
              onClick={() => setView(id)}
            >
              {id}
            </button>
          ))}
        </div>
        <label className="min-w-0 flex-1 text-sm text-white/70">
          <span className="sr-only">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className={fieldClass + ' mt-0'}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      {view === 'setlists' ? (
        <>
          <NeonButton
            variant="emerald"
            size="small"
            type="button"
            onClick={() => {
              setNewSetlistName('')
              setCreatingSetlist(true)
            }}
          >
            Create setlist
          </NeonButton>
          {filteredSetlists.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-white/50">
              {setlists.length === 0 ? 'No setlists yet.' : 'No setlists match that search.'}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSetlists.map((sl) => {
                const onLive = sl.id === activeSetlistId
                return (
                  <article key={sl.id} className="flex flex-col rounded-xl border border-white/15 bg-black/35 p-4">
                    <h2 className="text-lg font-semibold leading-snug text-white">{sl.name}</h2>
                    <p className="mt-1 text-sm tabular-nums text-white/55">
                      {formatSetlistProgress(sl.questionIds.length)}
                      {isSetlistTargetLength(sl.questionIds.length) ? '' : ` · target ${VENUE_QUESTION_SET_LENGTH}`}
                    </p>
                    {onLive ? (
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-300">On Live</p>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-3">
                      <NeonButton
                        variant="gold"
                        size="small"
                        type="button"
                        disabled={onLive}
                        onClick={() => onActivateSetlist(sl.id)}
                      >
                        {setlistLiveActionLabel(onLive, activeSetlistNextIndex, sl.questionIds.length)}
                      </NeonButton>
                      <div className="flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        className="font-semibold text-casino-gold hover:underline"
                        onClick={() => setSetlistDraftId(sl.id)}
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        className="text-white/60 hover:text-white"
                        onClick={() => duplicateSetlist(sl)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-red-400/90 hover:text-red-300"
                        onClick={() => setPendingDelete({ kind: 'setlist', id: sl.id, name: sl.name })}
                      >
                        Delete
                      </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <QuestionLibrary
          gameState={gameState}
          questions={filteredQuestions}
          bankEmpty={questionBank.length === 0}
          setlists={setlists}
          importFileRef={importFileRef}
          importReplaceRef={importReplaceRef}
          onImportError={onImportError}
          onOpenCreate={openCreateQuestion}
          onEdit={startEditBankQuestion}
          onDelete={(q) => setPendingDelete({ kind: 'question', id: q.id, name: q.text })}
          onPush={handlePushBankQuestion}
          onAddToSetlist={setAddTarget}
        />
      )}
      </div>

      {creatingSetlist ? (
        <HostModal
          title="Create setlist"
          onClose={() => {
            setCreatingSetlist(false)
            setNewSetlistName('')
          }}
        >
          <label className="block text-sm text-white/80">
            Name
            <input
              autoFocus
              value={newSetlistName}
              onChange={(e) => setNewSetlistName(e.target.value)}
              placeholder="Friday night"
              className={fieldClass}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createSetlist()
              }}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <NeonButton variant="emerald" size="small" type="button" onClick={createSetlist}>
              Create
            </NeonButton>
            <NeonButton
              variant="purple"
              size="small"
              type="button"
              onClick={() => {
                setCreatingSetlist(false)
                setNewSetlistName('')
              }}
            >
              Cancel
            </NeonButton>
          </div>
        </HostModal>
      ) : null}

      {createQuestionOpen || editingBankId != null ? (
        <HostModal
          title={editingBankId ? 'Edit question' : creatingForSetlistId ? 'Add new question' : 'Create question'}
          onClose={closeQuestionForm}
        >
          <form onSubmit={submitQuestion} className="space-y-3">
            {creatingForSetlistId && !editingBankId ? (
              <p className="text-sm text-white/60">Saved to the bank and added to this setlist.</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-white/80">
                Category
                <input
                  autoFocus
                  value={qbCategory}
                  onChange={(e) => setQbCategory(e.target.value)}
                  placeholder="General knowledge"
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm text-white/80">
                Difficulty (1–5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={qbDifficulty}
                  onChange={(e) => setQbDifficulty(e.target.value)}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm text-white/80 sm:col-span-2">
                Question
                <textarea
                  value={qbText}
                  onChange={(e) => setQbText(e.target.value)}
                  rows={3}
                  className={fieldClass}
                  placeholder="A prompt with a numeric answer"
                />
              </label>
              <label className="block text-sm text-white/80">
                Correct answer
                <input
                  type="number"
                  step="any"
                  value={qbAnswer}
                  onChange={(e) => setQbAnswer(e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <NeonButton variant="emerald" size="small" type="submit">
                {editingBankId ? 'Save changes' : creatingForSetlistId ? 'Add to setlist' : 'Create question'}
              </NeonButton>
              <NeonButton variant="purple" size="small" type="button" onClick={closeQuestionForm}>
                Cancel
              </NeonButton>
            </div>
          </form>
        </HostModal>
      ) : null}

      {setlistDraftId && draft ? (
        <HostModal
          wide
          title="Manage setlist"
          onClose={() => {
            setAddCueOpen(false)
            setSetlistDraftId(null)
          }}
        >
          <SetlistManage
            draft={draft}
            questionBank={questionBank}
            renameDraft={renameDraft}
            setRenameDraft={setRenameDraft}
            isActive={activeSetlistId === draft.id}
            nextIndex={activeSetlistId === draft.id ? activeSetlistNextIndex : 0}
            onActivate={() => onActivateSetlist(draft.id)}
            onRenameBlur={() => {
              const next = renameDraft.trim()
              if (!next || next === draft.name) return
              setlistSave({ id: draft.id, name: next })
            }}
            onShuffle={() => shuffleSetlistQuestions(draft.id)}
            onDelete={() => setPendingDelete({ kind: 'setlist', id: draft.id, name: draft.name })}
            onOpenAdd={() => {
              setAddQuery('')
              setAddCueOpen(true)
            }}
            onOpenCreate={() => openAddNewToSetlist(draft.id)}
            onMove={(index, dir) => moveSetlistQuestion(draft.id, index, dir)}
            onRemove={(index) => removeSetlistQuestion(draft.id, index)}
          />
        </HostModal>
      ) : null}

      {setlistDraftId && !draft ? (
        <HostModal title="Setlist" onClose={() => setSetlistDraftId(null)}>
          <p className="text-sm text-white/60">That setlist is gone.</p>
        </HostModal>
      ) : null}

      {addCueOpen && draft ? (
        <HostModal
          wide
          title="Add from bank"
          onClose={() => {
            setAddCueOpen(false)
            setAddQuery('')
          }}
        >
          <AddCueResults
            questionBank={questionBank}
            draft={draft}
            query={addQuery}
            setQuery={setAddQuery}
            onAdd={(questionId) => appendQuestionToSetlist(draft.id, questionId)}
          />
        </HostModal>
      ) : null}

      {addTarget ? (
        <HostModal title="Add to setlist" onClose={() => setAddTarget(null)}>
          <p className="text-sm text-white/70">{addTarget.text}</p>
          {setlists.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">Create a setlist first.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {setlists.map((sl) => {
                const already = sl.questionIds.includes(addTarget.id)
                return (
                  <li key={sl.id}>
                    <button
                      type="button"
                      disabled={already}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm text-white hover:bg-white/10 disabled:text-white/35 disabled:hover:bg-transparent"
                      onClick={() => {
                        appendQuestionToSetlist(sl.id, addTarget.id)
                        setAddTarget(null)
                      }}
                    >
                      <span>{sl.name}</span>
                      <span className="text-xs text-white/45">{already ? 'Already in' : formatSetlistProgress(sl.questionIds.length)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </HostModal>
      ) : null}

      {pendingDelete ? (
        <HostModal title={pendingDelete.kind === 'setlist' ? 'Delete setlist' : 'Delete question'} onClose={() => setPendingDelete(null)}>
          <p className="text-sm leading-relaxed text-white/75">
            {pendingDelete.kind === 'setlist'
              ? `Delete “${pendingDelete.name}”? Live will no longer step through it.`
              : `Remove this question from the bank? “${pendingDelete.name}”`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <NeonButton variant="red" size="small" type="button" onClick={confirmPendingDelete}>
              Delete
            </NeonButton>
            <NeonButton variant="purple" size="small" type="button" onClick={() => setPendingDelete(null)}>
              Cancel
            </NeonButton>
          </div>
        </HostModal>
      ) : null}
    </section>
  )
}

function SetlistManage(props: {
  draft: SetlistRow
  questionBank: Question[]
  renameDraft: string
  setRenameDraft: (v: string) => void
  isActive: boolean
  nextIndex: number
  onActivate: () => void
  onRenameBlur: () => void
  onShuffle: () => void
  onDelete: () => void
  onOpenAdd: () => void
  onOpenCreate: () => void
  onMove: (index: number, dir: 'up' | 'down') => void
  onRemove: (index: number) => void
}) {
  const { draft, questionBank } = props
  const liveLabel = setlistLiveActionLabel(props.isActive, props.nextIndex, draft.questionIds.length)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label className="block text-sm text-white/70">
            Setlist name
            <input
              value={props.renameDraft}
              onChange={(e) => props.setRenameDraft(e.target.value)}
              onBlur={props.onRenameBlur}
              className={fieldClass + ' text-lg font-semibold'}
            />
          </label>
          <p
            className={`mt-2 text-sm tabular-nums ${
              isSetlistTargetLength(draft.questionIds.length) ? 'text-emerald-300/90' : 'text-amber-200/85'
            }`}
          >
            {formatSetlistProgress(draft.questionIds.length)}
            {isSetlistTargetLength(draft.questionIds.length) ? '' : ` · target ${VENUE_QUESTION_SET_LENGTH}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NeonButton variant="gold" size="small" type="button" onClick={props.onActivate} disabled={props.isActive}>
            {liveLabel}
          </NeonButton>
          <NeonButton
            variant="purple"
            size="small"
            type="button"
            disabled={draft.questionIds.length < 2}
            onClick={props.onShuffle}
          >
            Shuffle
          </NeonButton>
          <NeonButton variant="red" size="small" type="button" onClick={props.onDelete}>
            Delete
          </NeonButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <NeonButton variant="emerald" size="small" type="button" onClick={props.onOpenAdd}>
          Add from bank
        </NeonButton>
        <NeonButton variant="gold" size="small" type="button" onClick={props.onOpenCreate}>
          Add new question
        </NeonButton>
      </div>

      {draft.questionIds.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-white/50">
          No cues yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {draft.questionIds.map((qid, i) => {
            const q = questionBank.find((b) => b.id === qid)
            return (
              <li key={`${draft.id}:${i}:${qid}`} className="rounded-xl border border-white/12 bg-black/35 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                      #{i + 1}
                      {q?.category ? ` · ${q.category}` : ''}
                    </p>
                    <p className="mt-1 text-base leading-snug text-white">
                      {q ? q.text : `Missing from the bank (${qid})`}
                    </p>
                    {q ? (
                      <p className="mt-1 font-mono text-lg font-bold text-casino-gold">{formatTriviaNumber(q.answer)}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <button
                      type="button"
                      disabled={i === 0}
                      className="text-white/55 hover:text-white disabled:opacity-25"
                      onClick={() => props.onMove(i, 'up')}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={i >= draft.questionIds.length - 1}
                      className="text-white/55 hover:text-white disabled:opacity-25"
                      onClick={() => props.onMove(i, 'down')}
                    >
                      Down
                    </button>
                    <button type="button" className="text-red-400/90 hover:text-red-300" onClick={() => props.onRemove(i)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function AddCueResults(props: {
  questionBank: Question[]
  draft: SetlistRow
  query: string
  setQuery: (value: string) => void
  onAdd: (questionId: string) => void
}) {
  const [category, setCategory] = useState('all')
  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const q of props.questionBank) {
      const name = q.category?.trim()
      if (name) names.add(name)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [props.questionBank])

  const visible = props.questionBank.filter((q) => {
    if (category !== 'all' && (q.category?.trim() || 'Uncategorized') !== category) return false
    return matchesQuery(`${q.text} ${q.category ?? ''} ${q.answer}`, props.query)
  })
  const inRundown = new Set(props.draft.questionIds)

  return (
    <div className="space-y-3">
      <label className="block text-sm text-white/80">
        Search
        <input
          autoFocus
          value={props.query}
          onChange={(e) => props.setQuery(e.target.value)}
          placeholder="Question, category, or answer"
          className={fieldClass}
        />
      </label>
      {categories.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categories">
          <button
            type="button"
            role="tab"
            aria-selected={category === 'all'}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              category === 'all' ? 'bg-white/15 text-white ring-1 ring-white/25' : 'text-white/55 hover:text-white'
            }`}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={category === name}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                category === name ? 'bg-white/15 text-white ring-1 ring-white/25' : 'text-white/55 hover:text-white'
              }`}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-xs tabular-nums text-white/45">
        {visible.length} of {props.questionBank.length}
      </p>
      {props.questionBank.length === 0 ? (
        <p className="text-sm text-white/50">The bank is empty.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-white/50">No questions in this view.</p>
      ) : (
        <ul className="space-y-1">
          {visible.map((q) => {
            const already = inRundown.has(q.id)
            return (
              <li key={q.id}>
                <button
                  type="button"
                  disabled={already}
                  className="flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10 disabled:text-white/35 disabled:hover:bg-transparent"
                  onClick={() => props.onAdd(q.id)}
                >
                  <span className="min-w-0">
                    {q.category?.trim() ? (
                      <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">{q.category}</span>
                    ) : null}
                    <span className={already ? 'text-white/40' : 'text-white/90'}>{q.text}</span>
                  </span>
                  <span className={`shrink-0 font-mono ${already ? 'text-white/40' : 'text-casino-gold'}`}>
                    {already ? 'In rundown' : formatTriviaNumber(q.answer)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function QuestionLibrary(props: {
  gameState: GameState
  questions: Question[]
  bankEmpty: boolean
  setlists: SetlistRow[]
  importFileRef: RefObject<HTMLInputElement | null>
  importReplaceRef: { current: boolean }
  onImportError: (msg: string) => void
  onOpenCreate: () => void
  onEdit: (q: Question) => void
  onDelete: (q: Question) => void
  onPush: (id: string) => void
  onAddToSetlist: (q: Question) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <NeonButton variant="emerald" size="small" type="button" onClick={props.onOpenCreate}>
          Create question
        </NeonButton>
        <input
          ref={props.importFileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const input = e.target
            const f = input.files?.[0]
            input.value = ''
            if (!f) return
            const reader = new FileReader()
            reader.onload = () => {
              try {
                const txt = String(reader.result ?? '')
                const lower = f.name.toLowerCase()
                const rows = lower.endsWith('.csv') ? parseQuestionsCsv(txt) : parseQuestionsJson(txt)
                questionBankImportRows(rows, props.importReplaceRef.current)
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                props.onImportError(`Import failed: ${msg}`)
              }
            }
            reader.readAsText(f)
          }}
        />
        <NeonButton
          variant="gold"
          size="small"
          type="button"
          onClick={() => {
            props.importReplaceRef.current = false
            props.importFileRef.current?.click()
          }}
        >
          Import
        </NeonButton>
        <NeonButton
          variant="red"
          size="small"
          type="button"
          onClick={() => {
            props.importReplaceRef.current = true
            props.importFileRef.current?.click()
          }}
        >
          Replace bank
        </NeonButton>
        <NeonButton variant="purple" size="small" type="button" onClick={() => questionBankRestoreSamples()}>
          Restore starter
        </NeonButton>
      </div>
      <HostCollapsible summary="Import formats">
        <p className="text-sm leading-relaxed text-white/50">
          CSV columns: text, answer; optional category, difficulty. JSON: a top-level array, or an object with a
          questions array.
        </p>
      </HostCollapsible>

      {props.questions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-white/50">
          {props.bankEmpty
            ? 'The bank is empty.'
            : 'No questions match that search.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {props.questions.map((q) => {
            const live = props.gameState.round.question?.id === q.id
            const memberships = props.setlists.filter((sl) => sl.questionIds.includes(q.id))
            return (
              <li key={q.id} className="rounded-xl border border-white/12 bg-black/35 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                  {q.category?.trim() || 'Uncategorized'}
                  {q.difficulty != null ? ` · Lv ${q.difficulty}` : ''}
                  {live ? ' · On the tables' : ''}
                </p>
                <p className="mt-1 text-base leading-snug text-white">{q.text}</p>
                <p className="mt-1 font-mono text-lg font-bold text-casino-gold">{formatTriviaNumber(q.answer)}</p>
                {memberships.length > 0 ? (
                  <p className="mt-1 text-xs text-white/45">In {memberships.map((sl) => sl.name).join(', ')}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <button type="button" className="font-semibold text-casino-gold hover:underline" onClick={() => props.onAddToSetlist(q)}>
                    Add to setlist
                  </button>
                  <button type="button" className="font-semibold text-casino-emerald hover:underline" onClick={() => props.onPush(q.id)}>
                    To tables
                  </button>
                  <button type="button" className="text-white/65 hover:text-white" onClick={() => props.onEdit(q)}>
                    Edit
                  </button>
                  <button type="button" className="text-red-400/90 hover:text-red-300" onClick={() => props.onDelete(q)}>
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
