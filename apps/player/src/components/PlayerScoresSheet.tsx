import type { PlayerVenueBrief } from '@qhe/net'
import { formatTriviaPoints } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import { PlayerGoldShellCorners } from './PlayerGoldChrome'

type ScoreRow = NonNullable<PlayerVenueBrief['scores']>[number]
type ScoreBoard = 'chips' | 'trivia'

function scoreValue(board: ScoreBoard, value: number): string {
  if (board === 'chips') return `$${Math.max(0, Math.round(value)).toLocaleString()}`
  return `${formatTriviaPoints(value)} pts`
}

function ScoreLine({ board, rank, row }: { board: ScoreBoard; rank: number; row: ScoreRow }) {
  const table = row.tableNum != null && row.tableNum > 0 ? `Table ${row.tableNum}` : null
  return (
    <li className="player-scores-row">
      <span className="player-scores-rank">{rank}</span>
      <span className="player-scores-who">
        <span className="player-scores-name">{row.name}</span>
        {table ? <span className="player-scores-table">{table}</span> : null}
      </span>
      <span className="player-scores-value">
        <ChipText text={scoreValue(board, row.value)} />
      </span>
    </li>
  )
}

/** Phone popup while the host is showing chip scores or trivia scores. */
export default function PlayerScoresSheet({ brief }: { brief: PlayerVenueBrief | null }) {
  const board = brief?.scoresBoard
  if (board !== 'chips' && board !== 'trivia') return null
  const title = board === 'chips' ? 'Chip leaders' : 'Trivia leaders'
  const rows = brief?.scores ?? []
  return (
    <div className="player-scores-modal" role="dialog" aria-modal="true" aria-labelledby="player-scores-title">
      <div className="player-game-modal-backdrop" aria-hidden />
      <div className="player-scores-modal-card player-join-shell">
        <PlayerGoldShellCorners />
        <h2 id="player-scores-title" className="player-game-panel-title">
          {title}
        </h2>
        <ol className="player-scores-modal-list">
          {rows.map((row, index) => (
            <ScoreLine key={`${row.tableNum ?? 0}:${row.name}:${index}`} board={board} rank={index + 1} row={row} />
          ))}
        </ol>
      </div>
    </div>
  )
}
