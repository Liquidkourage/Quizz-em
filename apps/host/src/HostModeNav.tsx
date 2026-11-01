import type { ReactNode } from 'react'
import { HOST_MODES, type HostMode } from './hostMode'

/** Pre-show, Live, and Questions, with More docked on Questions' right. */
export function HostModeNav({
  mode,
  onSelect,
  liveCount,
  more,
}: {
  mode: HostMode
  onSelect: (mode: HostMode) => void
  liveCount: number
  more: ReactNode
}) {
  return (
    <div className="host-mode-nav mt-2 flex flex-wrap items-stretch gap-1 rounded-xl border border-white/10 p-1.5 backdrop-blur-sm">
      <nav className="flex flex-wrap items-stretch gap-1" role="tablist" aria-label="Host modes">
        {HOST_MODES.map((t) => {
          const active = mode === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={t.hint}
              data-active={active ? 'true' : 'false'}
              className={`host-mode-tab min-h-10 shrink-0 rounded-lg px-4 py-1.5 text-center text-base font-semibold transition-colors sm:min-w-[8.5rem] sm:text-left ${
                active
                  ? 'bg-white/14 text-white shadow-inner ring-1 ring-casino-emerald/35'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90'
              }`}
              onClick={() => onSelect(t.id)}
            >
              <span className="inline-flex items-center justify-center gap-1.5 leading-snug">
                <span>{t.label}</span>
                {t.id === 'live' && liveCount > 0 ? (
                  <span
                    className={`relative flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-2 text-xs font-black tabular-nums text-black shadow-[0_0_12px_rgba(251,191,36,0.85)] ${
                      mode !== 'live' ? 'motion-safe:animate-pulse' : ''
                    }`}
                  >
                    {liveCount > 99 ? '99+' : liveCount}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </nav>
      {more}
    </div>
  )
}
