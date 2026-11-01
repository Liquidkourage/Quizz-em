import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const HostModalDepth = createContext(0)

export function useHostModalNested(): boolean {
  return useContext(HostModalDepth) > 0
}

export function HostModal({
  title,
  open,
  onClose,
  children,
}: {
  title: ReactNode
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const depth = useContext(HostModalDepth)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    if (depth > 0) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, depth])

  if (!open) return null

  const overlay = (
    <HostModalDepth.Provider value={depth + 1}>
      <div
        className="fixed inset-0 flex items-end justify-center p-3 sm:items-center sm:p-6"
        style={{ zIndex: 80 + depth * 10 }}
        role="presentation"
      >
        <button type="button" className="absolute inset-0 bg-black/75" aria-label="Close" onClick={onClose} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            onClose()
          }}
          className="relative flex h-[min(86vh,48rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0c1014] shadow-[0_24px_80px_rgba(0,0,0,0.7)] outline-none"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0 text-base font-semibold text-white">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        </div>
      </div>
    </HostModalDepth.Provider>
  )

  if (typeof document === 'undefined') return overlay
  return createPortal(overlay, document.body)
}
