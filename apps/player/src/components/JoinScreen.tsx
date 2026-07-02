import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { sanitizeLastInitialInput } from '../playerJoinName'
import type { PlayerJoinBootstrap } from '../playerUrlParams'

type JoinScreenProps = {
  prefs: PlayerJoinBootstrap
  onChange: (next: PlayerJoinBootstrap) => void
  onJoin: () => void
  joinError?: string | null
  isConnecting?: boolean
}

function JoinCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return <span aria-hidden className={`player-join-corner player-join-corner--${position}`} />
}

function JoinDiamond() {
  return <span aria-hidden className="player-join-diamond" />
}

export default function JoinScreen({
  prefs,
  onChange,
  onJoin,
  joinError = null,
  isConnecting = false,
}: JoinScreenProps) {
  const firstNameInputRef = useRef<HTMLInputElement>(null)

  const canJoin =
    !isConnecting &&
    prefs.firstName.trim().length > 0 &&
    prefs.lastInitial.trim().length > 0 &&
    prefs.roomCode.trim().length > 0

  const focusName =
    prefs.roomFromUrl && !prefs.nameFromUrl && prefs.firstName.trim().length === 0

  const roomLocked = prefs.roomFromUrl && prefs.roomCode.trim().length > 0

  useEffect(() => {
    if (!focusName) return
    firstNameInputRef.current?.focus()
  }, [focusName])

  function patch(next: Partial<PlayerJoinBootstrap>) {
    onChange({ ...prefs, ...next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canJoin) onJoin()
  }

  return (
    <div className="player-join-screen">
      <div className="player-join-bg" aria-hidden>
        <span className="player-join-suit player-join-suit--club">♣</span>
        <span className="player-join-suit player-join-suit--diamond">♦</span>
        <div className="player-join-floor-glow" />
      </div>

      <div className="player-join-layout">
        <div className="player-join-logo">
          <div className="player-join-logo-glow" aria-hidden />
          <QuizzEmWordmark layout="fill" depth="hero" />
        </div>

        <motion.div
          className="player-join-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <JoinCorner position="tl" />
          <JoinCorner position="tr" />
          <JoinCorner position="bl" />
          <JoinCorner position="br" />

          <h1 className="player-join-title">Join the game</h1>
          <div className="player-join-divider" aria-hidden />

          {roomLocked ? (
            <p className="player-join-room">
              Room <span className="player-join-room-code">{prefs.roomCode.trim()}</span>
            </p>
          ) : null}

          <form className="player-join-form" onSubmit={handleSubmit}>
            <div className="player-join-name-row">
              <div className="player-join-field">
                <label htmlFor="player-first-name" className="player-join-label">
                  First name
                </label>
                <input
                  id="player-first-name"
                  ref={firstNameInputRef}
                  type="text"
                  placeholder="Jay"
                  value={prefs.firstName}
                  onChange={(e) => patch({ firstName: e.target.value })}
                  autoComplete="given-name"
                  className="player-join-input"
                />
              </div>
              <div className="player-join-field player-join-field--initial">
                <label htmlFor="player-last-initial" className="player-join-label">
                  Initial
                </label>
                <input
                  id="player-last-initial"
                  type="text"
                  placeholder="L"
                  value={prefs.lastInitial}
                  onChange={(e) => patch({ lastInitial: sanitizeLastInitialInput(e.target.value) })}
                  autoComplete="off"
                  inputMode="text"
                  maxLength={1}
                  aria-label="Last initial"
                  className="player-join-input player-join-input--initial"
                />
              </div>
            </div>

            {!roomLocked ? (
              <div className="player-join-field">
                <label htmlFor="player-venue-code" className="player-join-label">
                  Venue code
                </label>
                <input
                  id="player-venue-code"
                  type="text"
                  placeholder="HOST01"
                  value={prefs.roomCode}
                  onChange={(e) => patch({ roomCode: e.target.value.toUpperCase() })}
                  autoComplete="off"
                  className="player-join-input player-join-input--code"
                />
              </div>
            ) : null}

            {joinError ? <p className="player-join-error">{joinError}</p> : null}

            <div className="player-join-btn-row">
              <JoinDiamond />
              <button type="submit" className="player-join-btn" disabled={!canJoin}>
                {isConnecting ? 'Connecting…' : 'Join game'}
              </button>
              <JoinDiamond />
            </div>

            <p className="player-join-footnote">
              You&apos;ll be assigned a table when the host starts.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
