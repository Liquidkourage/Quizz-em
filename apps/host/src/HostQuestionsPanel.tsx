import { type FormEvent, type RefObject } from 'react'
import { Card, NeonButton } from '@qhe/ui'
import type { GameState, Question } from '@qhe/core'
import {
  VENUE_QUESTION_SET_LENGTH,
  formatSetlistProgress,
  isSetlistTargetLength,
} from '@qhe/core'
import {
  questionBankDelete,
  questionBankMove,
  questionBankRestoreSamples,
  questionBankImportRows,
  setlistCreate,
  setlistSave,
  setlistDelete,
} from '@qhe/net'
import { HostCollapsible } from './hostDeskLayout'
import { parseQuestionsCsv, parseQuestionsJson } from './questionImport'

export type HostQuestionsPanelProps = {
  gameState: GameState
  questionBank: Question[]
  setlists: Array<{ id: string; name: string; questionIds: string[] }>
  draftSetlist: { id: string; name: string; questionIds: string[] } | undefined
  setlistDraftId: string | null
  setSetlistDraftId: (id: string | null) => void
  setlistRenameDraft: string
  setSetlistRenameDraft: (v: string) => void
  newSetlistName: string
  setNewSetlistName: (v: string) => void
  addToSetlistChoice: string
  setAddToSetlistChoice: (v: string) => void
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

export function HostQuestionsPanel(p: HostQuestionsPanelProps) {
  const {
    gameState, questionBank, setlists, draftSetlist, setlistDraftId, setSetlistDraftId,
    setlistRenameDraft, setSetlistRenameDraft, newSetlistName, setNewSetlistName,
    addToSetlistChoice, setAddToSetlistChoice, qbText, setQbText, qbAnswer, setQbAnswer,
    qbCategory, setQbCategory, qbDifficulty, setQbDifficulty, editingBankId,
    importFileRef, importReplaceRef, onImportError, handleSaveBankQuestion, resetQuestionDraft,
    startEditBankQuestion, appendQuestionToSetlist, moveSetlistQuestion, removeSetlistQuestion,
    shuffleSetlistQuestions, handlePushBankQuestion,
  } = p
  return (
    <>
        <Card variant="glass" hover={false} className="mb-4 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Question bank</h2>
              <p className="mt-0.5 text-xs text-white/50">
                Venue <span className="font-mono text-white/65">{gameState.code}</span> ·{' '}
                {VENUE_QUESTION_SET_LENGTH}-question sets · activate from Live
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <input
                ref={importFileRef}
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
                      const rows = lower.endsWith('.csv')
                        ? parseQuestionsCsv(txt)
                        : parseQuestionsJson(txt)
                      questionBankImportRows(rows, importReplaceRef.current)
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : String(err)
                      onImportError(`Import failed: ${msg}`)
                      
                    }
                  }
                  reader.readAsText(f)
                }}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <NeonButton
                  variant="gold"
                  size="small"
                  type="button"
                  onClick={() => {
                    importReplaceRef.current = false
                    importFileRef.current?.click()
                  }}
                >
                  Import append
                </NeonButton>
                <NeonButton
                  variant="red"
                  size="small"
                  type="button"
                  onClick={() => {
                    importReplaceRef.current = true
                    importFileRef.current?.click()
                  }}
                >
                  Import replace bank
                </NeonButton>
                <NeonButton variant="purple" size="small" type="button" onClick={() => questionBankRestoreSamples()}>
                  Restore starter set ({VENUE_QUESTION_SET_LENGTH})
                </NeonButton>
              </div>
              <HostCollapsible summary="Import formats &amp; storage" className="mt-2">
                <p className="text-sm leading-relaxed text-white/50">
                  Auto-saved on change. Postgres via <span className="font-mono">DATABASE_URL</span> on Railway; locally SQLite{' '}
                  <span className="text-white/60">venue-libraries.sqlite</span>. CSV columns: text, answer; optional category,
                  difficulty. JSON: top-level array or object with a questions array.
                </p>
              </HostCollapsible>
            </div>
          </div>

          <HostCollapsible summary={editingBankId ? 'Edit question' : 'Add question'} className="mb-4">
          <form onSubmit={handleSaveBankQuestion} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block md:col-span-2 text-sm text-white/80">
                Prompt
                <textarea
                  value={qbText}
                  onChange={e => setQbText(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                  placeholder="Trivia prompt with a numeric correct answer…"
                />
              </label>
              <label className="block text-base text-white/80">
                Correct answer (number)
                <input
                  type="number"
                  value={qbAnswer}
                  onChange={e => setQbAnswer(e.target.value)}
                  step="any"
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
              <label className="block text-base text-white/80">
                Category (optional)
                <input
                  type="text"
                  value={qbCategory}
                  onChange={e => setQbCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
              <label className="block text-base text-white/80 md:col-span-2">
                Difficulty (1–5, optional)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={qbDifficulty}
                  onChange={e => setQbDifficulty(e.target.value)}
                  placeholder="blank"
                  className="mt-1 w-full max-w-[200px] rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <NeonButton variant="emerald" size="small" type="submit">
                {editingBankId ? 'Save changes' : 'Add to bank'}
              </NeonButton>
              {editingBankId ? (
                <NeonButton variant="purple" size="small" type="button" onClick={() => resetQuestionDraft()}>
                  Cancel edit
                </NeonButton>
              ) : null}
            </div>
          </form>
          </HostCollapsible>

          <div className="overflow-x-auto max-h-[min(420px,45vh)] overflow-y-auto rounded-lg border border-white/15">
            <table className="min-w-full text-left text-base text-white/90">
              <thead className="sticky top-0 bg-gray-950/95 z-10 text-white/60">
                <tr>
                  <th className="py-2 px-3 w-12">#</th>
                  <th className="py-2 px-3">Question</th>
                  <th className="py-2 px-3">Answer</th>
                  <th className="py-2 px-3">Cat</th>
                  <th className="py-2 px-3 w-10">Lv</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionBank.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-white/50">
                      Bank is empty — add questions, import a set, or restore the {VENUE_QUESTION_SET_LENGTH}-question starter.
                    </td>
                  </tr>
                ) : (
                  questionBank.map((q, i) => (
                    <tr
                      key={q.id}
                      className={`border-t border-white/10 ${
                        gameState.round.question?.id === q.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 tabular-nums text-white/70">{i + 1}</td>
                      <td className="py-2 px-3 align-top max-w-md">{q.text}</td>
                      <td className="py-2 px-3 align-top whitespace-nowrap text-casino-gold">{q.answer}</td>
                      <td className="py-2 px-3 align-top text-white/60">{q.category ?? '—'}</td>
                      <td className="py-2 px-3 align-top text-white/60">{q.difficulty ?? '—'}</td>
                      <td className="py-2 px-3 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-white/65 hover:text-white mr-1 disabled:opacity-30"
                          disabled={i === 0}
                          onClick={() => questionBankMove(q.id, 'up')}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="text-white/65 hover:text-white mr-2 disabled:opacity-30"
                          disabled={i === questionBank.length - 1}
                          onClick={() => questionBankMove(q.id, 'down')}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <select
                          className="mr-2 max-w-[9.5rem] rounded border border-white/20 bg-zinc-950 px-1.5 py-0.5 text-xs text-white [color-scheme:dark] disabled:opacity-40"
                          value=""
                          disabled={setlists.length === 0}
                          aria-label={`Add “${q.text.slice(0, 40)}” to a setlist`}
                          title={
                            setlists.length === 0
                              ? 'Create a setlist below first'
                              : 'Add this question to a setlist'
                          }
                          onChange={(e) => {
                            const setlistId = e.target.value
                            if (!setlistId) return
                            appendQuestionToSetlist(setlistId, q.id)
                            e.currentTarget.value = ''
                          }}
                        >
                          <option value="" className="bg-zinc-950 text-white">
                            + Setlist…
                          </option>
                          {setlists.map((sl) => {
                            const already = sl.questionIds.includes(q.id)
                            return (
                              <option
                                key={sl.id}
                                value={sl.id}
                                disabled={already}
                                className="bg-zinc-950 text-white"
                              >
                                {already ? `✓ ${sl.name}` : sl.name}
                              </option>
                            )
                          })}
                        </select>
                        <button
                          type="button"
                          className="text-casino-emerald hover:underline mr-2 text-xs uppercase font-bold"
                          onClick={() => handlePushBankQuestion(q.id)}
                        >
                          To tables
                        </button>
                        <button
                          type="button"
                          className="text-white/65 hover:text-white mr-2 text-xs"
                          onClick={() => startEditBankQuestion(q)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-400/90 hover:text-red-300 text-xs"
                          onClick={() => {
                            if (confirm('Remove this question from the bank?')) questionBankDelete(q.id)
                          }}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card variant="glass" hover={false} className="mb-4 p-4 sm:p-5">
          <div className="mb-4 border-b border-white/10 pb-3">
            <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Setlists (rundowns)</h2>
            <p className="mt-0.5 text-xs text-white/50">
              {VENUE_QUESTION_SET_LENGTH}-question rundowns · activate on Live → Next question
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <label className="block text-base text-white/80">
              New setlist name
              <input
                type="text"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                placeholder={`e.g. Set 1 — Pop culture (${VENUE_QUESTION_SET_LENGTH} cues)`}
                className="mt-1 block rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 w-64 max-w-[80vw]"
              />
            </label>
            <NeonButton
              variant="emerald"
              size="small"
              type="button"
              onClick={() => {
                const n = newSetlistName.trim()
                if (!n) return
                setlistCreate(n)
                setNewSetlistName('')
              }}
            >
              Create empty setlist
            </NeonButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3">
              <label className="block text-base text-white/80">
                Edit setlist
                <select
                  className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white [color-scheme:dark]"
                  value={setlistDraftId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setSetlistDraftId(id)
                    const sl = id ? setlists.find((s) => s.id === id) : undefined
                    setSetlistRenameDraft(sl?.name ?? '')
                  }}
                >
                  <option value="" className="bg-zinc-950 text-white">
                    Select a setlist…
                  </option>
                  {setlists.map((sl) => (
                    <option key={sl.id} value={sl.id} className="bg-zinc-950 text-white">
                      {sl.name} ({formatSetlistProgress(sl.questionIds.length)})
                    </option>
                  ))}
                </select>
              </label>
              {setlistDraftId ? (
                <>
                  <label className="block text-base text-white/80">
                    Rundown name
                    <input
                      type="text"
                      value={setlistRenameDraft}
                      onChange={(e) => setSetlistRenameDraft(e.target.value)}
                      onBlur={() => {
                        const sl = setlists.find((s) => s.id === setlistDraftId)
                        const next = setlistRenameDraft.trim()
                        if (!sl || !next || next === sl.name) return
                        setlistSave({ id: setlistDraftId, name: next })
                      }}
                      className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                    />
                  </label>
                  <NeonButton
                    variant="red"
                    size="small"
                    type="button"
                    onClick={() => {
                      if (
                        !confirm(
                          'Delete this setlist? It will be removed from the rundown picker.'
                        )
                      )
                        return
                      setlistDelete(setlistDraftId)
                      setSetlistDraftId(null)
                      setSetlistRenameDraft('')
                    }}
                  >
                    Delete setlist
                  </NeonButton>
                </>
              ) : null}
            </div>
            <div className="rounded-xl border border-white/15 bg-black/25 p-4 min-h-[120px]">
              {!setlistDraftId ? (
                <p className="text-sm text-white/50">Select a setlist to arrange its questions.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-white/90">
                      Question order
                      {draftSetlist ? (
                        <span
                          className={`ml-2 font-normal tabular-nums ${
                            isSetlistTargetLength(draftSetlist.questionIds.length)
                              ? 'text-emerald-300/90'
                              : 'text-amber-200/85'
                          }`}
                        >
                          {formatSetlistProgress(draftSetlist.questionIds.length)}
                        </span>
                      ) : null}
                    </div>
                    <NeonButton
                      variant="purple"
                      size="small"
                      type="button"
                      disabled={!draftSetlist || draftSetlist.questionIds.length < 2}
                      title="Randomize cue order"
                      onClick={() => {
                        if (!setlistDraftId) return
                        shuffleSetlistQuestions(setlistDraftId)
                      }}
                    >
                      Shuffle
                    </NeonButton>
                  </div>
                  {!draftSetlist || isSetlistTargetLength(draftSetlist.questionIds.length) ? null : (
                    <p className="text-xs text-amber-200/80">
                      Sets target {VENUE_QUESTION_SET_LENGTH} cues — add or remove questions to match.
                    </p>
                  )}
                  <select
                    className="w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-sm text-white [color-scheme:dark]"
                    value={addToSetlistChoice}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v || !setlistDraftId) return
                      appendQuestionToSetlist(setlistDraftId, v)
                      setAddToSetlistChoice('')
                    }}
                  >
                    <option value="" className="bg-zinc-950 text-white">
                      + Add from bank…
                    </option>
                    {questionBank
                      .filter((q) => draftSetlist && !draftSetlist.questionIds.includes(q.id))
                      .map((q) => (
                        <option key={q.id} value={q.id} className="bg-zinc-950 text-white">
                          {q.text.length > 70 ? `${q.text.slice(0, 70)}…` : q.text}
                        </option>
                      ))}
                  </select>
                  <ul className="space-y-2 max-h-[min(320px,40vh)] overflow-y-auto">
                    {!draftSetlist ? null : draftSetlist.questionIds.length === 0 ? (
                      <li className="text-xs text-white/45">
                        No questions yet — append from the bank above.
                      </li>
                    ) : (
                      draftSetlist.questionIds.map((qid, i) => {
                        const qRow = questionBank.find((b) => b.id === qid)
                        const label = qRow ? qRow.text : `(missing bank id: ${qid})`
                        const sid = setlistDraftId!
                        return (
                          <li
                            key={`${sid}:${i}:${qid}`}
                            className="rounded-lg border border-white/12 bg-black/30 px-2 py-2 text-sm text-white/90 flex gap-2 items-start justify-between"
                          >
                            <span className="min-w-0">
                              <span className="text-white/40 tabular-nums mr-2">{i + 1}.</span>
                              {label}
                            </span>
                            <span className="flex shrink-0 gap-1 items-center whitespace-nowrap">
                              <button
                                type="button"
                                disabled={i === 0}
                                className="text-white/55 hover:text-white disabled:opacity-25"
                                title="Move earlier"
                                onClick={() => moveSetlistQuestion(sid, i, 'up')}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={i >= draftSetlist.questionIds.length - 1}
                                className="text-white/55 hover:text-white disabled:opacity-25"
                                title="Move later"
                                onClick={() => moveSetlistQuestion(sid, i, 'down')}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="text-red-400/90 hover:text-red-300 text-xs"
                                onClick={() => removeSetlistQuestion(sid, i)}
                              >
                                Remove
                              </button>
                            </span>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
    </>
  )
}
