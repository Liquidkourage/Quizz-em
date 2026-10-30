import { type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react'
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
  const pendingCreate = useRef<{ name: string; knownIds: Set<string> } | null>(null)

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
    setCreateQuestionOpen(true)
    setView('questions')
  }

  function closeQuestionForm() {
    resetQuestionDraft()
    setCreateQuestionOpen(false)
  }

  function submitQuestion(e: FormEvent) {
    if (!qbText.trim() || Number.isNaN(Number(qbAnswer))) {
      handleSaveBankQuestion(e)
      return
    }
    handleSaveBankQuestion(e)
    setCreateQuestionOpen(false)
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

  if (setlistDraftId && draft) {
    return (
      <SetlistManage
        draft={draft}
        questionBank={questionBank}
        renameDraft={renameDraft}
        setRenameDraft={setRenameDraft}
        addQuery={addQuery}
        setAddQuery={setAddQuery}
        isActive={activeSetlistId === draft.id}
        nextIndex={activeSetlistId === draft.id ? activeSetlistNextIndex : 0}
        onBack={() => setSetlistDraftId(null)}
        onActivate={() => onActivateSetlist(draft.id)}
        onRenameBlur={() => {
          const next = renameDraft.trim()
          if (!next || next === draft.name) return
          setlistSave({ id: draft.id, name: next })
        }}
        onShuffle={() => shuffleSetlistQuestions(draft.id)}
        onDelete={() => {
          if (!confirm('Delete this setlist? Live will no longer step through it.')) return
          setlistDelete(draft.id)
          setSetlistDraftId(null)
        }}
        onAdd={(questionId) => {
          appendQuestionToSetlist(draft.id, questionId)
          setAddQuery('')
        }}
        onMove={(index, dir) => moveSetlistQuestion(draft.id, index, dir)}
        onRemove={(index) => removeSetlistQuestion(draft.id, index)}
      />
    )
  }

  if (setlistDraftId && !draft) {
    return (
      <div className="rounded-xl border border-white/15 bg-black/30 p-5">
        <p className="text-sm text-white/60">That setlist is gone.</p>
        <NeonButton className="mt-3" variant="purple" size="small" type="button" onClick={() => setSetlistDraftId(null)}>
          Back to setlists
        </NeonButton>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

      {view === 'setlists' ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            {creatingSetlist ? (
              <>
                <label className="block text-sm text-white/80">
                  Setlist name
                  <input
                    value={newSetlistName}
                    onChange={(e) => setNewSetlistName(e.target.value)}
                    placeholder="Friday night"
                    className={fieldClass + ' w-64 max-w-[80vw]'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createSetlist()
                    }}
                  />
                </label>
                <NeonButton variant="emerald" size="small" type="button" onClick={createSetlist}>
                  Create
                </NeonButton>
                <NeonButton variant="purple" size="small" type="button" onClick={() => setCreatingSetlist(false)}>
                  Cancel
                </NeonButton>
              </>
            ) : (
              <NeonButton variant="emerald" size="small" type="button" onClick={() => setCreatingSetlist(true)}>
                Create setlist
              </NeonButton>
            )}
          </div>
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
                    <div className="mt-4 flex items-center gap-3 text-sm">
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
                        onClick={() => {
                          if (!confirm(`Delete “${sl.name}”?`)) return
                          setlistDelete(sl.id)
                        }}
                      >
                        Delete
                      </button>
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
          formOpen={createQuestionOpen || editingBankId != null}
          editing={editingBankId != null}
          qbText={qbText}
          setQbText={setQbText}
          qbAnswer={qbAnswer}
          setQbAnswer={setQbAnswer}
          qbCategory={qbCategory}
          setQbCategory={setQbCategory}
          qbDifficulty={qbDifficulty}
          setQbDifficulty={setQbDifficulty}
          importFileRef={importFileRef}
          importReplaceRef={importReplaceRef}
          onImportError={onImportError}
          onOpenCreate={openCreateQuestion}
          onCloseForm={closeQuestionForm}
          onSubmit={submitQuestion}
          onEdit={startEditBankQuestion}
          onDelete={(id) => {
            if (confirm('Remove this question from the bank?')) questionBankDelete(id)
          }}
          onPush={handlePushBankQuestion}
          onAddToSetlist={appendQuestionToSetlist}
        />
      )}
    </section>
  )
}

function SetlistManage(props: {
  draft: SetlistRow
  questionBank: Question[]
  renameDraft: string
  setRenameDraft: (v: string) => void
  addQuery: string
  setAddQuery: (v: string) => void
  isActive: boolean
  nextIndex: number
  onBack: () => void
  onActivate: () => void
  onRenameBlur: () => void
  onShuffle: () => void
  onDelete: () => void
  onAdd: (questionId: string) => void
  onMove: (index: number, dir: 'up' | 'down') => void
  onRemove: (index: number) => void
}) {
  const { draft, questionBank } = props
  const addable = questionBank.filter(
    (q) =>
      !draft.questionIds.includes(q.id) &&
      matchesQuery(`${q.text} ${q.category ?? ''} ${q.answer}`, props.addQuery),
  )
  const finished = props.isActive && props.nextIndex >= draft.questionIds.length && draft.questionIds.length > 0
  const liveLabel = !props.isActive
    ? 'Use on Live'
    : finished
      ? 'On Live · finished'
      : `On Live · cue ${props.nextIndex + 1} of ${draft.questionIds.length}`

  return (
    <section className="space-y-4">
      <button type="button" className="text-sm font-semibold text-white/60 hover:text-white" onClick={props.onBack}>
        ← Setlists
      </button>
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

      <label className="block text-sm text-white/70">
        Add from bank
        <input
          value={props.addQuery}
          onChange={(e) => props.setAddQuery(e.target.value)}
          placeholder="Search questions to add"
          className={fieldClass}
        />
      </label>
      {props.addQuery.trim() && addable.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-2">
          {addable.slice(0, 8).map((q) => (
            <li key={q.id}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
                onClick={() => props.onAdd(q.id)}
              >
                <span className="min-w-0 text-white/90">{q.text}</span>
                <span className="shrink-0 font-mono text-casino-gold">{formatTriviaNumber(q.answer)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {draft.questionIds.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-white/50">
          No cues yet. Search the bank above to add the first one.
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
    </section>
  )
}

function QuestionLibrary(props: {
  gameState: GameState
  questions: Question[]
  bankEmpty: boolean
  setlists: SetlistRow[]
  formOpen: boolean
  editing: boolean
  qbText: string
  setQbText: (v: string) => void
  qbAnswer: string
  setQbAnswer: (v: string) => void
  qbCategory: string
  setQbCategory: (v: string) => void
  qbDifficulty: string
  setQbDifficulty: (v: string) => void
  importFileRef: RefObject<HTMLInputElement | null>
  importReplaceRef: { current: boolean }
  onImportError: (msg: string) => void
  onOpenCreate: () => void
  onCloseForm: () => void
  onSubmit: (e: FormEvent) => void
  onEdit: (q: Question) => void
  onDelete: (id: string) => void
  onPush: (id: string) => void
  onAddToSetlist: (setlistId: string, questionId: string) => void
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

      {props.formOpen ? (
        <form onSubmit={props.onSubmit} className="space-y-3 rounded-xl border border-white/15 bg-black/35 p-4">
          <h2 className="text-base font-semibold text-white">{props.editing ? 'Edit question' : 'New question'}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-white/80">
              Category
              <input
                value={props.qbCategory}
                onChange={(e) => props.setQbCategory(e.target.value)}
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
                value={props.qbDifficulty}
                onChange={(e) => props.setQbDifficulty(e.target.value)}
                placeholder="Optional"
                className={fieldClass}
              />
            </label>
            <label className="block text-sm text-white/80 md:col-span-2">
              Question
              <textarea
                value={props.qbText}
                onChange={(e) => props.setQbText(e.target.value)}
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
                value={props.qbAnswer}
                onChange={(e) => props.setQbAnswer(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <NeonButton variant="emerald" size="small" type="submit">
              {props.editing ? 'Save changes' : 'Create question'}
            </NeonButton>
            <NeonButton variant="purple" size="small" type="button" onClick={props.onCloseForm}>
              Cancel
            </NeonButton>
          </div>
        </form>
      ) : null}

      {props.questions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-white/50">
          {props.bankEmpty
            ? `The bank is empty. Create a question, import a file, or restore the ${VENUE_QUESTION_SET_LENGTH}-question starter.`
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
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <select
                    className="max-w-[14rem] rounded border border-white/20 bg-zinc-950 px-2 py-1 text-xs text-white [color-scheme:dark]"
                    value=""
                    disabled={props.setlists.length === 0}
                    aria-label={`Add “${q.text.slice(0, 40)}” to a setlist`}
                    onChange={(e) => {
                      const setlistId = e.target.value
                      if (!setlistId) return
                      props.onAddToSetlist(setlistId, q.id)
                      e.currentTarget.value = ''
                    }}
                  >
                    <option value="">Add to setlist…</option>
                    {props.setlists.map((sl) => {
                      const already = sl.questionIds.includes(q.id)
                      return (
                        <option key={sl.id} value={sl.id} disabled={already}>
                          {already ? `✓ ${sl.name}` : sl.name}
                        </option>
                      )
                    })}
                  </select>
                  <button type="button" className="font-semibold text-casino-emerald hover:underline" onClick={() => props.onPush(q.id)}>
                    To tables
                  </button>
                  <button type="button" className="text-white/65 hover:text-white" onClick={() => props.onEdit(q)}>
                    Edit
                  </button>
                  <button type="button" className="text-red-400/90 hover:text-red-300" onClick={() => props.onDelete(q.id)}>
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
