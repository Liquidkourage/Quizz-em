import type { ReactNode } from 'react'

type LeaderboardFrameProps = {
  children: ReactNode
  /** Tighter chrome for 49–64 player single-page layouts at 1080p. */
  fullField?: boolean
}

/** Full-viewport decorative TV bezel around the public leaderboard. */
export function LeaderboardFrame({ children, fullField = false }: LeaderboardFrameProps) {
  return (
    <div className="venue-lb-screen fixed inset-0 overflow-hidden text-white">
      <div className="venue-lb-screen-bg pointer-events-none absolute inset-0" aria-hidden />
      <div
        className={`venue-lb-bezel relative flex h-full min-h-0 w-full flex-col${
          fullField ? ' venue-lb-bezel--full-field' : ''
        }`}
      >
        <div
          className={`venue-lb-viewport relative flex min-h-0 flex-1 flex-col overflow-hidden${
            fullField ? ' venue-lb-viewport--full-field' : ''
          }`}
        >
          <div className="venue-lb-viewport-inner relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
