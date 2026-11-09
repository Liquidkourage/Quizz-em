import { useEffect, useRef } from 'react'
import type { PlayerVenueBrief } from '@qhe/net'
import { formatTriviaPointsLine, formatWholeTriviaPoints } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import { PlayerGoldShellCorners } from './PlayerGoldChrome'

type ScoreRow = NonNullable<PlayerVenueBrief['scores']>[number]
type ScoreBoard = 'chips' | 'trivia'

function scoreValue(board: ScoreBoard, value: number): string {
  if (board === 'chips') return `$${Math.max(0, Math.round(value)).toLocaleString()}`
  return formatTriviaPointsLine(value)
}

function samePlayerName(a: string, b: string): boolean {
  return a.trim().localeCompare(b.trim(), undefined, { sensitivity: 'base' }) === 0
}

function ownScoreIndex(
  rows: readonly ScoreRow[],
  selfName: string | null | undefined,
  selfTableNum: number | null,
): number {
  const name = (selfName ?? '').trim()
  if (!name) return -1
  let first = -1
  let atTable = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !samePlayerName(row.name, name)) continue
    if (first < 0) first = i
    if (selfTableNum != null && row.tableNum === selfTableNum) atTable = i
  }
  if (atTable >= 0) return atTable
  return first
}

function ScoreLine({
  board,
  rank,
  row,
  mine,
}: {
  board: ScoreBoard
  rank: number
  row: ScoreRow
  mine: boolean
}) {
  const table = row.tableNum != null && row.tableNum > 0 ? `Table ${row.tableNum}` : null
  const rowClass = mine ? 'player-scores-row player-scores-row--mine' : 'player-scores-row'
  return (
    <li className={rowClass} aria-current={mine ? 'true' : undefined}>
      <span className="player-scores-rank">{rank}</span>
      <span className="player-scores-who">
        <span className="player-scores-name">{row.name}</span>
        {table ? <span className="player-scores-table">{table}</span> : null}
      </span>
      <span className="player-scores-value">
        <ChipText text={scoreValue(board, row.value)} />
        {board === 'chips' && typeof row.points === 'number' ? (
          <span className="player-scores-points">{formatWholeTriviaPoints(row.points)}</span>
        ) : null}
      </span>
    </li>
  )
}

/** Phone popup while the host is showing chip scores or trivia scores. */
export default function PlayerScoresSheet({
  brief,
  selfName,
  selfTableNum,
}: {
  brief: PlayerVenueBrief | null
  selfName?: string | null
  selfTableNum?: number | null
}) {
  const board = brief?.scoresBoard
  const listRef = useRef<HTMLOListElement>(null)
  const rows = brief?.scores ?? []
  const mineAt = board === 'chips' || board === 'trivia' ? ownScoreIndex(rows, selfName, selfTableNum ?? null) : -1
  useEffect(() => {
    const node = listRef.current?.querySelector('.player-scores-row--mine')
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' })
  }, [mineAt, board])
  if (board !== 'chips' && board !== 'trivia') return null
  const title = board === 'chips' ? 'Chip leaders' : 'Best of the Rest'
  return (
    <div className="player-scores-modal" role="dialog" aria-modal="true" aria-labelledby="player-scores-title">
      <div className="player-game-modal-backdrop" aria-hidden />
      <div className="player-scores-modal-card player-join-shell">
        <PlayerGoldShellCorners />
        <h2 id="player-scores-title" className="player-game-panel-title">
          {title}
        </h2>
        <ol className="player-scores-modal-list" ref={listRef}>
          {rows.map((row, index) => (
            <ScoreLine
              key={`${row.tableNum ?? 0}:${row.name}:${index}`}
              board={board}
              rank={index + 1}
              row={row}
              mine={index === mineAt}
            />
          ))}
        </ol>
      </div>
    </div>
  )
}
