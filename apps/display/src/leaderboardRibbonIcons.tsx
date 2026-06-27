/** Small gold icons for the leaderboard statistics ribbon. */
export function LeaderboardTopStackIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M5 16l1.5-6.5L12 11l5.5-1.5L19 16H5zm1 2h12v2H6v-2z" />
    </svg>
  )
}

export function LeaderboardAverageIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 19h16v2H4v-2zM6 17V9h3v8H6zm5 0V5h3v12h-3zm5 0v-6h3v6h-3z" />
    </svg>
  )
}

export function LeaderboardMedianIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 18h16v2H4v-2zm2-2 4-7 4 4 4-9 2 12H6z" />
    </svg>
  )
}

export function LeaderboardTablesIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M3 8h18v2H3V8zm2 4h14v8H5v-8zm2 2v4h4v-4H7zm6 0v4h4v-4h-4z" />
    </svg>
  )
}
