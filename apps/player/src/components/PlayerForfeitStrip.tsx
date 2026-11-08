export const MISSED_GUESS_LINE = 'No guess in time — 0 points, and you cannot win this pot.'

/** One line while the table is back on screen, waiting for the answer to be revealed. */
export default function PlayerForfeitStrip({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="player-game-strip" role="status">
      {MISSED_GUESS_LINE}
    </p>
  )
}
