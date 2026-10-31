import { useState, type ReactNode } from 'react'
import { HostModal } from './HostModal'

/** Recovery tools open in a popup so the live desk stays put. */
export function HostMoreMenu({
  children,
  defaultOpen = false,
}: {
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-left text-base font-semibold text-white/75 hover:bg-white/[0.04] hover:text-white/90"
        onClick={() => setOpen(true)}
      >
        <span>More</span>
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-sky-200/80">Open</span>
      </button>
      <HostModal title="More" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">{children}</div>
      </HostModal>
    </div>
  )
}
