import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { formatTriviaPoints } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import {
  formatChipChange,
  formatStack,
  formatWinnerLine,
  nextTableResultSort,
  sortTableResultRows,
  type TableResultRow,
  type TableResultSort,
  type TableResultSortKey,
  type TableResults,
} from '../playerModel/tableResults'
import { PlayerGameButton, PlayerGoldPanel } from './PlayerGoldChrome'

type TableResultsPanelProps = {
  results: TableResults
}

const COLUMNS: { key: TableResultSortKey; label: string; numeric: boolean }[] = [
  { key: 'name', label: 'Name', numeric: false },
  { key: 'answer', label: 'Answer', numeric: true },
  { key: 'off', label: 'Off', numeric: true },
  { key: 'points', label: 'Pts', numeric: true },
  { key: 'stack', label: 'Stack', numeric: true },
  { key: 'change', label: 'Change', numeric: true },
]

function BestHandPopup({
  hand,
  played,
  onClose,
}: {
  hand: string
  played: boolean
  onClose: () => void
}) {
  const popup: ReactNode = (
    <div className="player-deal-flash" role="dialog" aria-modal="true" aria-label="Best hand">
      <div className="player-deal-flash-backdrop" aria-hidden />
      <div className="player-deal-flash-card">
        <p className="player-deal-flash-title">Best hand</p>
        <p className="player-best-hand-number">{hand}</p>
        {played ? <p className="player-best-hand-played">You played it.</p> : null}
        <PlayerGameButton variant="gold" size="large" className="player-best-hand-close" onClick={onClose}>
          Close
        </PlayerGameButton>
      </div>
    </div>
  )
  if (typeof document === 'undefined') return popup
  return createPortal(popup, document.body)
}

function ariaSort(sort: TableResultSort, key: TableResultSortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

function ResultRow({ row }: { row: TableResultRow }) {
  return (
    <div
      role="row"
      className={[
        'player-table-results-row',
        row.isYou ? 'player-table-results-row--you' : '',
        row.isPotWinner ? 'player-table-results-row--winner' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="player-table-results-name" role="cell">
        {row.name}
        {row.isYou ? <span className="player-table-results-you">You</span> : null}
      </span>
      <span
        className={`player-table-results-answer player-table-results-num${row.folded ? ' player-table-results-answer--muted' : ''}`}
        role="cell"
      >
        {row.formattedAnswer}
      </span>
      <span className="player-table-results-num" role="cell">
        {row.formattedOff}
      </span>
      <span className="player-table-results-num" role="cell">
        {formatTriviaPoints(row.triviaPoints)}
      </span>
      <span className="player-table-results-stack player-table-results-num" role="cell">
        <ChipText text={formatStack(row.stack)} />
      </span>
      <span
        className={[
          'player-table-results-change',
          'player-table-results-num',
          row.chipChange > 0 ? 'player-table-results-change--up' : '',
          row.chipChange < 0 ? 'player-table-results-change--down' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="cell"
      >
        <ChipText text={formatChipChange(row.chipChange)} />
      </span>
    </div>
  )
}

export default function TableResultsPanel({ results }: TableResultsPanelProps) {
  const [sort, setSort] = useState<TableResultSort>({ key: 'off', dir: 'asc' })
  const [bestHandOpen, setBestHandOpen] = useState(true)
  const you = results.rows.find((row) => row.isYou)
  const orderedRows = sortTableResultRows(results.rows, sort.key, sort.dir)

  return (
    <PlayerGoldPanel title="Table results">
      {results.yourBestHand && bestHandOpen ? (
        <BestHandPopup
          hand={results.yourBestHand}
          played={results.yourBestHandPlayed}
          onClose={() => setBestHandOpen(false)}
        />
      ) : null}
      <div className="player-table-results-header">
        <p className="player-table-results-correct">
          Correct:{' '}
          <span className="player-game-result-correct">{results.formattedCorrect}</span>
        </p>
        <p className="player-table-results-winners">{formatWinnerLine(results)}</p>
        {you ? (
          <p className="player-table-results-you-line">
            {you.submitted == null ? (
              you.folded ? 'Folded chips — no answer submitted' : 'No answer submitted'
            ) : (
              <>
                Your answer{' '}
                <span className="player-game-result-mono">{you.formattedAnswer}</span>
                {' · off '}
                <span className="player-game-result-mono">{you.formattedOff}</span>
                {' · '}
                <strong className="player-game-result-mono">{formatTriviaPoints(you.triviaPoints)}</strong> pts
                {you.folded ? ' · folded chips' : null}
              </>
            )}
          </p>
        ) : null}
        {results.yourBestHand ? (
          <p className="player-table-results-best">
            {results.yourBestHandPlayed
              ? `Best hand ${results.yourBestHand} — you played it.`
              : `Best hand ${results.yourBestHand}`}
          </p>
        ) : null}
      </div>

      <div className="player-table-results-scroll" role="table" aria-label="Table hand results">
        <div className="player-table-results-row player-table-results-row--head" role="row">
          {COLUMNS.map((column) => (
            <span
              key={column.key}
              role="columnheader"
              aria-sort={ariaSort(sort, column.key)}
              className={column.numeric ? 'player-table-results-num' : undefined}
            >
              <button
                type="button"
                className="player-table-results-sort"
                onClick={() => setSort((current) => nextTableResultSort(current, column.key))}
              >
                {column.label}
              </button>
            </span>
          ))}
        </div>
        {orderedRows.map((row) => (
          <ResultRow key={row.playerId} row={row} />
        ))}
      </div>
    </PlayerGoldPanel>
  )
}
