import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { sanitizeLastInitialInput } from '../playerJoinName'
import type { PlayerJoinBootstrap } from '../playerUrlParams'
import {
  PlayerGoldBackdrop,
  PlayerGoldDivider,
  PlayerGoldHeaderRule,
  PlayerGoldShellCorners,
} from './PlayerGoldChrome'

type JoinScreenProps = {
  prefs: PlayerJoinBootstrap
  onChange: (next: PlayerJoinBootstrap) => void
  onJoin: () => void
  joinError?: string | null
  isConnecting?: boolean
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
  const lastInitialInputRef = useRef<HTMLInputElement>(null)
  const venueCodeInputRef = useRef<HTMLInputElement>(null)

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

  function handleLastInitialChange(raw: string) {
    const next = sanitizeLastInitialInput(raw)
    patch({ lastInitial: next })
    if (next.length === 1 && !roomLocked) {
      window.requestAnimationFrame(() => venueCodeInputRef.current?.focus())
    }
  }

  return (
    <div className="player-join-screen">
      <PlayerGoldBackdrop />

      <div className="player-join-layout">
        <motion.div
          className="player-join-shell"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <PlayerGoldShellCorners />

          <header className="player-join-header">
            <div className="player-join-logo-glow" aria-hidden />
            <div className="player-join-logo">
              <QuizzEmWordmark layout="fill" depth="hero" />
            </div>
          </header>

          <PlayerGoldHeaderRule />

          <div className="player-join-body">
            <h1 className="player-join-title">Join the game</h1>
            <PlayerGoldDivider />

            {roomLocked ? (
              <p className="player-join-room">
                Room <span className="player-join-room-code">{prefs.roomCode.trim()}</span>
              </p>
            ) : null}

            <form className="player-join-form" onSubmit={handleSubmit}>
              <div className="player-join-fields">
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
                      autoCapitalize="words"
                      autoCorrect="off"
                      enterKeyHint="next"
                      className="player-join-input"
                    />
                  </div>
                  <div className="player-join-field player-join-field--initial">
                    <label htmlFor="player-last-initial" className="player-join-label">
                      Initial
                    </label>
                    <input
                      id="player-last-initial"
                      ref={lastInitialInputRef}
                      type="text"
                      placeholder="L"
                      value={prefs.lastInitial}
                      onChange={(e) => handleLastInitialChange(e.target.value)}
                      autoComplete="off"
                      inputMode="text"
                      maxLength={1}
                      aria-label="Last initial"
                      enterKeyHint={roomLocked ? 'go' : 'next'}
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
                      ref={venueCodeInputRef}
                      type="text"
                      placeholder="HOST01"
                      value={prefs.roomCode}
                      onChange={(e) => patch({ roomCode: e.target.value.toUpperCase() })}
                      autoComplete="off"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      className="player-join-input player-join-input--code"
                    />
                  </div>
                ) : null}

                {joinError ? <p className="player-join-error">{joinError}</p> : null}
              </div>

              <div className="player-join-actions">
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
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
