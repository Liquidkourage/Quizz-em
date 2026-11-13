import { useEffect, useState } from 'react'
import { roomCodeHint, roomCodeToApply } from './hostVenueCode'

/** The room code players type. Setting a new one opens that room. */
export function HostRoomCodeControl({
  code,
  onApply,
}: {
  code: string
  onApply: (next: string) => void
}) {
  const [draft, setDraft] = useState(code)
  useEffect(() => setDraft(code), [code])
  const next = roomCodeToApply(code, draft)
  const hint = roomCodeHint(code, draft)
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (next) onApply(next)
      }}
    >
      <label htmlFor="host-room-code" className="text-white/45">
        Room
      </label>
      <input
        id="host-room-code"
        value={draft}
        onChange={(event) => setDraft(event.target.value.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={12}
        aria-label="Room code"
        className="w-[7.5rem] rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono font-semibold uppercase text-white/90"
      />
      <button
        type="submit"
        disabled={next == null}
        className="rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-1 text-sm font-bold text-amber-100 hover:bg-amber-900/50 disabled:opacity-40"
      >
        Set code
      </button>
      {hint ? <span className="text-sm text-amber-100/80">{hint}</span> : null}
    </form>
  )
}
