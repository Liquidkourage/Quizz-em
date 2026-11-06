import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'

const MOSAIC_PREVIEW_COUNTS = Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, index) => index + 1)

/** TV mosaic sizes. Closing puts back whatever the screens were already showing. */
export function HostMosaicPreviewPanel({
  activeCount,
  onShow,
}: {
  activeCount: number | null
  onShow: (tableCount: number | null) => void
}) {
  return (
    <section className="space-y-2" aria-label="Table mosaic preview">
      <p className="text-sm font-bold uppercase tracking-wide text-white/45">Table mosaic</p>
      <p className="text-sm text-white/60">
        Shows on the TVs. The live game stays as it is.
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mosaic table count">
        {MOSAIC_PREVIEW_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            aria-label={`Show ${count} tables`}
            aria-pressed={activeCount === count}
            onClick={() => onShow(count)}
            className={`min-w-[2.75rem] rounded-md px-2.5 py-2.5 text-center text-base font-bold tabular-nums ${
              activeCount === count
                ? 'border border-amber-400/60 bg-amber-500/25 text-amber-100'
                : 'border border-white/15 text-white/75 hover:bg-white/10'
            }`}
          >
            {count}
          </button>
        ))}
      </div>
      {activeCount != null ? (
        <p className="text-sm font-semibold text-amber-100">Showing {activeCount} tables</p>
      ) : null}
      <button
        type="button"
        onClick={() => onShow(null)}
        className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
      >
        Close mosaic
      </button>
    </section>
  )
}
