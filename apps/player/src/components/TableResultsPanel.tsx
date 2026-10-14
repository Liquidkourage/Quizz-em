import type { TableResults } from '../playerModel/tableResults'
import { formatChipChange, formatStack, formatWinnerLine } from '../playerModel/tableResults'
import { ChipText } from '@qhe/ui'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type TableResultsPanelProps = {
  results: TableResults
}

export default function TableResultsPanel({ results }: TableResultsPanelProps) {
  const you = results.rows.find((r) => r.isYou)
  const orderedRows = [
    ...results.rows.filter((r) => r.isYou),
    ...results.rows.filter((r) => !r.isYou && r.isPotWinner),
    ...results.rows.filter((r) => !r.isYou && !r.isPotWinner),
  ]

  return (
    <PlayerGoldPanel title="Table results">
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
                {' · '}
                <strong className="player-game-result-mono">{you.triviaPoints}</strong> pts
                {you.folded ? ' · folded chips' : null}
              </>
            )}
          </p>
        ) : null}
      </div>

      <div className="player-table-results-scroll" role="table" aria-label="Table hand results">
        <div className="player-table-results-row player-table-results-row--head" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Answer</span>
          <span role="columnheader">Stack</span>
          <span role="columnheader">Change</span>
        </div>
        {orderedRows.map((row) => (
          <div
            key={row.playerId}
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
              className={`player-table-results-answer${row.folded ? ' player-table-results-answer--muted' : ''}`}
              role="cell"
            >
              {row.formattedAnswer}
            </span>
            <span className="player-table-results-stack" role="cell">
              <ChipText text={formatStack(row.stack)} />
            </span>
            <span
              className={[
                'player-table-results-change',
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
        ))}
      </div>
    </PlayerGoldPanel>
  )
}
