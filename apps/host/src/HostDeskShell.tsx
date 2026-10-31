import type { ReactNode } from 'react'

/** The host desk fills the scaled frame. The stage fills whatever the header does not. */
export function HostDeskShell({
  header,
  children,
}: {
  header: ReactNode
  children: ReactNode
}) {
  return (
    <div className="host-desk relative z-10 mx-auto flex h-full max-h-full w-full max-w-[100rem] flex-col overflow-hidden px-3 py-2 sm:px-4">
      <div className="shrink-0">{header}</div>
      <div className="host-desk-stage flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
