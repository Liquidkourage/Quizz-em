import { NeonButton } from '@qhe/ui'

export type HostAttachedDisplay = { socketId: string; name: string }

export function HostConnectedDisplays({
  displays,
  onRelease,
  emptyLabel = true,
}: {
  displays: HostAttachedDisplay[]
  onRelease: (socketId: string) => void
  /** Pre-show explains an empty list. Live hides the row until a TV is attached. */
  emptyLabel?: boolean
}) {
  if (displays.length === 0) {
    if (!emptyLabel) return null
    return <p className="mt-3 text-sm text-white/45">No TV is attached.</p>
  }

  return (
    <ul className="mt-1.5 space-y-1" aria-label="Attached displays">
      {displays.map((display) => (
        <li
          key={display.socketId}
          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5"
        >
          <span className="min-w-0 truncate text-sm font-semibold text-sky-100">{display.name}</span>
          <NeonButton variant="red" size="small" type="button" onClick={() => onRelease(display.socketId)}>
            Disconnect
          </NeonButton>
        </li>
      ))}
    </ul>
  )
}
