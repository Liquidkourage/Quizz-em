import { useState } from 'react'
import { CardBackSvg, digitsAscending, NumericPlayingCard } from '@qhe/ui'

function holdKey(key: string): boolean {
  return key === ' ' || key === 'Enter'
}

/** The two hole cards. Faces exist in the page only while the peek is held. */
export function HolePeekFaces({
  digits,
  held,
}: {
  digits: readonly [number, number]
  held: boolean
}) {
  if (!held) {
    return (
      <span className="player-hole-peek-pair" aria-hidden>
        <CardBackSvg className="player-hole-peek-back" />
        <CardBackSvg className="player-hole-peek-back" />
      </span>
    )
  }
  const ordered = digitsAscending(digits)
  return (
    <span className="player-hole-peek-pair">
      {ordered.map((digit, index) => (
        <NumericPlayingCard key={`${index}-${digit}`} digit={digit} size="small" compact animated={false} />
      ))}
    </span>
  )
}

/** Small hold target. Releasing the press hides the cards again. */
export function HolePeek({ digits }: { digits: readonly [number, number] }) {
  const [held, setHeld] = useState(false)
  const show = () => setHeld(true)
  const hide = () => setHeld(false)
  return (
    <button
      type="button"
      className="player-hole-peek"
      aria-label={held ? 'Your cards' : 'Hold to peek'}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        show()
      }}
      onPointerUp={hide}
      onPointerCancel={hide}
      onLostPointerCapture={hide}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (!holdKey(event.key) || event.repeat) return
        event.preventDefault()
        show()
      }}
      onKeyUp={(event) => {
        if (holdKey(event.key)) hide()
      }}
      onBlur={hide}
    >
      <span className="player-hole-peek-label">{held ? 'Your cards' : 'Hold to peek'}</span>
      <HolePeekFaces digits={digits} held={held} />
    </button>
  )
}
