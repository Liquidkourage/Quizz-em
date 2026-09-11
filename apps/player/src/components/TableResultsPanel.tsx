import type { TableResults } from '../playerModel/tableResults'
import { formatPotWin, formatWinnerLine } from '../playerModel/tableResults'
import { PlayerGoldPanel } from './PlayerGoldChrome'

type TableResultsPanelProps = {
  results: TableResults
}

export default function TableResultsPanel({ results }: TableResultsPanelProps) {
  return (
    <PlayerGoldPanel title="Table results">
      <div className="player-table-results-header">
        <p className="player-table-results-correct">
          Correct:{' '}
          <span className="player-game-result-correct">{results.formattedCorrect}</span>
        </p>
        <p className="player-table-results-winners">{formatWinnerLine(results)}</p>
      </div>

      <div className="player-table-results-scroll" role="table" aria-label="Table hand results">
        <div className="player-table-results-row player-table-results-row--head" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Answer</span>
          <span role="columnheader">Pot</span>
        </div>
        {results.rows.map((row) => (
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
            <span
              className={`player-table-results-pot${row.chipPayout > 0 ? ' player-table-results-pot--win' : ''}`}
              role="cell"
            >
              {formatPotWin(row.chipPayout)}
            </span>
          </div>
        ))}
      </div>
    </PlayerGoldPanel>
  )
}
