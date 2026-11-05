import type { PlayerVenueBrief } from '@qhe/net'
import { formatTriviaPoints } from '@qhe/core'
import { ChipText } from '@qhe/ui'

type ScoreRow = NonNullable<PlayerVenueBrief['scores']>[number]
type ScoreBoard = 'chips' | 'trivia'

function scoreValue(board: ScoreBoard, value: number): string {
  if (board === 'chips') return `$${Math.max(0, Math.round(value)).toLocaleString()}`
  return `${formatTriviaPoints(value)} pts`
}

function ScoreLine({ board, rank, row }: { board: ScoreBoard; rank: number; row: ScoreRow }) {
  const table = row.tableNum != null && row.tableNum > 0 ? `Table ${row.tableNum}` : null
  return (
    <li className="flex items-baseline gap-3 border-b border-white/10 py-2">
      <span className="w-8 shrink-0 text-right text-lg font-black text-amber-200/80">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xl font-bold text-white">{row.name}</span>
        {table ? <span className="text-sm text-white/55">{table}</span> : null}
      </span>
      <span className="shrink-0 text-xl font-black text-amber-100">
        <ChipText text={scoreValue(board, row.value)} />
      </span>
    </li>
  )
}

/** Covers the phone while the host is showing chip scores or trivia scores. */
export default function PlayerScoresSheet({ brief }: { brief: PlayerVenueBrief | null }) {
  const board = brief?.scoresBoard
  if (board !== 'chips' && board !== 'trivia') return null
  const title = board === 'chips' ? 'Chip leaders' : 'Trivia leaders'
  const rows = brief?.scores ?? []
  return (
    <section
      className="fixed inset-0 z-[90] flex flex-col bg-[#07080c] px-4 py-4 text-white"
      aria-label={title}
    >
      <h1 className="text-2xl font-black tracking-wide text-amber-100">{title}</h1>
      <ol className="mt-3 min-h-0 flex-1 overflow-y-auto pb-6">
        {rows.map((row, index) => (
          <ScoreLine key={`${row.tableNum ?? 0}:${row.name}:${index}`} board={board} rank={index + 1} row={row} />
        ))}
      </ol>
    </section>
  )
}
