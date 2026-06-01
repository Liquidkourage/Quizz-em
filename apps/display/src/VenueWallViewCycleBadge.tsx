import { motion } from 'framer-motion'

type VenueWallViewCycleBadgeProps = {
  label: string
  cycling: boolean
  cycleProgress: number
  viewIndex: number
  viewCount: number
}

/** Small indicator that the wall is auto-rotating intelligent views. */
export default function VenueWallViewCycleBadge({
  label,
  cycling,
  cycleProgress,
  viewIndex,
  viewCount,
}: VenueWallViewCycleBadgeProps) {
  if (!cycling && viewCount <= 1) return null

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-30 max-w-[min(14rem,42vw)] rounded-lg border border-white/15 bg-black/70 px-2 py-1.5 backdrop-blur-md sm:bottom-3 sm:left-3"
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55 sm:text-[11px]">
          View
        </span>
        <span className="truncate text-[11px] font-bold text-amber-200 sm:text-xs">{label}</span>
        {cycling && viewCount > 1 ? (
          <span className="shrink-0 text-[10px] tabular-nums text-white/45">
            {viewIndex + 1}/{viewCount}
          </span>
        ) : null}
      </div>
      {cycling ? (
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-amber-400/80"
            style={{ width: `${Math.round(cycleProgress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
