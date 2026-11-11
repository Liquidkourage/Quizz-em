import { useState } from 'react'
import { formatTriviaNumber, shownTriviaNumber } from '@qhe/core'
import type { HostVenueActionRow, HostVenueSeatContest } from '@qhe/net'
import { HostModal } from './HostModal'

export type HostGuessLine = {
  key: string
  tableNum: number
  name: string
  guess: number | null
  waiting: boolean
  distance: number | null
}

const LISTED_PHASES = new Set(['answering', 'reveal', 'showdown'])
const REVEALED_PHASES = new Set(['reveal', 'showdown'])

function lockedGuess(seat: HostVenueSeatContest): number | null {
  return typeof seat.guess === 'number' && Number.isFinite(seat.guess) ? seat.guess : null
}

function guessDistance(guess: number | null, revealed: boolean, correct: number | null): number | null {
  if (!revealed || guess == null || correct == null || !Number.isFinite(correct)) return null
  return Math.abs(guess - correct)
}

function guessLine(
  tableNum: number,
  index: number,
  seat: HostVenueSeatContest,
  answering: boolean,
  revealed: boolean,
  correct: number | null,
): HostGuessLine {
  const guess = lockedGuess(seat)
  return {
    key: `${tableNum}:${index}:${seat.name}`,
    tableNum,
    name: seat.name,
    guess,
    waiting: guess == null && answering && seat.guessLocked !== true,
    distance: guessDistance(guess, revealed, correct),
  }
}

/** One line per seated player while a table is guessing or the answer is up. */
export function hostGuessLines(rows: readonly HostVenueActionRow[], correct: number | null): HostGuessLine[] {
  const lines: HostGuessLine[] = []
  for (const row of rows) {
    if (!LISTED_PHASES.has(row.phase)) continue
    const answering = row.phase === 'answering'
    const revealed = REVEALED_PHASES.has(row.phase)
    row.seats.forEach((seat, index) => {
      lines.push(guessLine(row.tableNum, index, seat, answering, revealed, correct))
    })
  }
  return lines
}

export function HostGuessList({
  lines,
  question = null,
}: {
  lines: readonly HostGuessLine[]
  question?: { text?: string | null; category?: string | null } | null
}) {
  const tables: { tableNum: number; lines: HostGuessLine[] }[] = []
  for (const line of lines) {
    const last = tables[tables.length - 1]
    if (last == null || last.tableNum !== line.tableNum) tables.push({ tableNum: line.tableNum, lines: [line] })
    else last.lines.push(line)
  }
  if (tables.length === 0) return <p className="text-sm text-white/50">No guesses this hand.</p>
  return (
    <div className="space-y-4">
      {tables.map((table) => (
        <section key={table.tableNum} aria-label={`Table ${table.tableNum} guesses`}>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white/45">Table {table.tableNum}</h3>
          <ul className="mt-1 space-y-1">
            {table.lines.map((line) => (
              <li key={line.key} className="flex items-baseline justify-between gap-3 text-lg text-white">
                <span className="min-w-0 truncate font-semibold">{line.name}</span>
                <span className="shrink-0 tabular-nums text-amber-100">
                  {line.waiting ? 'Waiting' : line.guess == null ? '—' : shownTriviaNumber(line.guess, question)}
                  {line.distance != null ? (
                    <span className="ml-3 text-white/70">off by {formatTriviaNumber(line.distance)}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** One tap beside the live question. The list stays on the host screen. */
export function HostLiveGuesses({
  rows,
  correct,
  question = null,
}: {
  rows: readonly HostVenueActionRow[] | null
  correct: number | null
  question?: { text?: string | null; category?: string | null } | null
}) {
  const [open, setOpen] = useState(false)
  const lines = hostGuessLines(rows ?? [], correct)
  if (lines.length === 0) return null
  return (
    <>
      <button
        type="button"
        className="shrink-0 self-start rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-base font-bold text-amber-50 hover:bg-amber-500/25"
        onClick={() => setOpen(true)}
      >
        Guesses
      </button>
      <HostModal title="Guesses" open={open} onClose={() => setOpen(false)}>
        <HostGuessList lines={lines} question={question} />
      </HostModal>
    </>
  )
}
