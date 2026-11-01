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
    <>
      <button
        type="button"
        className="host-mode-tab flex min-h-10 min-w-[5.5rem] shrink-0 items-center justify-center rounded-lg px-4 py-1.5 text-base font-semibold text-white/55 hover:bg-white/[0.06] hover:text-white/90 sm:min-w-[8.5rem]"
        onClick={() => setOpen(true)}
      >
        More
      </button>
      <HostModal title="More" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">{children}</div>
      </HostModal>
    </>
  )
}
