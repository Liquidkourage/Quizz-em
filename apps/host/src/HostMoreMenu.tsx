import { useState, type ReactNode } from 'react'

/** Single overflow for Live recovery tools — not a stack of always-visible drawers. */
export function HostMoreMenu({
  children,
  defaultOpen = false,
}: {
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-black/25">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-base font-semibold text-white/75 hover:bg-white/[0.04] hover:text-white/90"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>More — recovery, practice bots, diagnostics</span>
        <span className={`text-white/35 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open ? <div className="space-y-4 border-t border-white/10 px-4 py-4">{children}</div> : null}
    </div>
  )
}
