import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { sanitizeLastInitialInput } from '../playerJoinName'
import type { PlayerJoinBootstrap } from '../playerUrlParams'
import JoinScreenBackdrop from './JoinScreenBackdrop'
import { JoinGoldDiamond, JoinGoldDivider, JoinPanelCornerBrackets } from './JoinPanelChrome'

type JoinScreenProps = {
  prefs: PlayerJoinBootstrap
  onChange: (next: PlayerJoinBootstrap) => void
  onJoin: () => void
  joinError?: string | null
  isConnecting?: boolean
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

  const roomLocked = prefs.roomFromUrl && prefs.roomCode.trim().length > 0

  return (
    <div className="player-join-screen relative min-h-screen min-h-[100dvh] overflow-hidden">
      <JoinScreenBackdrop />

      <div className="player-join-layout">
        <div className="player-join-wordmark-stage relative">
          <div className="player-join-wordmark-glow" aria-hidden />
          <QuizzEmWordmark layout="fill" depth="hero" />
        </div>

        <motion.div
          className="player-join-panel-frame w-full"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="player-join-panel-corners">
            <JoinPanelCornerBrackets />
          </div>

          <div className="player-join-panel-surface">
            <h1 className="player-join-heading">Join the game</h1>
            <JoinGoldDivider />

            {roomLocked ? (
              <p className="player-join-room-line">
                Room <span className="player-join-room-code">{prefs.roomCode.trim()}</span>
              </p>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-3">
                <div>
                  <label htmlFor="player-first-name" className="player-join-field-label">
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
                    className="player-join-field"
                  />
                </div>
                <div>
                  <label htmlFor="player-last-initial" className="player-join-field-label">
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
                    className="player-join-field player-join-field--initial"
                  />
                </div>
              </div>

              {!roomLocked ? (
                <div>
                  <label htmlFor="player-venue-code" className="player-join-field-label">
                    Venue code
                  </label>
                  <input
                    id="player-venue-code"
                    type="text"
                    placeholder="HOST01"
                    value={prefs.roomCode}
                    onChange={(e) => patch({ roomCode: e.target.value.toUpperCase() })}
                    autoComplete="off"
                    className="player-join-field !font-[Orbitron,monospace] tracking-[0.1em]"
                  />
                </div>
              ) : null}

              {joinError ? <p className="player-join-error">{joinError}</p> : null}

              <div className="player-join-submit-row">
                <JoinGoldDiamond />
                <button type="submit" className="player-join-submit" disabled={!canJoin}>
                  {isConnecting ? 'Connecting…' : 'Join game'}
                </button>
                <JoinGoldDiamond />
              </div>

              <p className="player-join-footer">
                You&apos;ll be assigned a table when the host starts.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
