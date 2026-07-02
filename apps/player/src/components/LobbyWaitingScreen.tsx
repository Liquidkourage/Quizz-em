import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  PlayerGoldBackdrop,
  PlayerGoldDivider,
  PlayerGoldHeaderRule,
  PlayerGoldShellCorners,
} from './PlayerGoldChrome'

type LobbyWaitingScreenProps = {
  playerName: string
  venueCode: string
  waitingCount: number
  waitingPosition: number | null
  disconnected?: boolean
}

export default function LobbyWaitingScreen({
  playerName,
  venueCode,
  waitingCount,
  waitingPosition,
  disconnected,
}: LobbyWaitingScreenProps) {
  const queueLabel =
    waitingCount === 1 ? '1 player waiting to be seated' : `${waitingCount} players waiting to be seated`

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

          <div className="player-join-body player-lobby-body">
            {disconnected ? (
              <p className="player-lobby-reconnect" role="status">
                Reconnecting…
              </p>
            ) : null}

            <h1 className="player-join-title player-lobby-title">You&apos;re in — waiting to be seated</h1>
            <p className="player-lobby-lead">Host seats you before the first hand.</p>
            <PlayerGoldDivider />

            <div className="player-lobby-status" aria-live="polite">
              <div className="player-lobby-status-row">
                <span className="player-lobby-status-label">Playing as</span>
                <span className="player-lobby-status-value">{playerName}</span>
              </div>
              <div className="player-lobby-status-row">
                <span className="player-lobby-status-label">Venue</span>
                <span className="player-lobby-status-code">{venueCode}</span>
              </div>
              <div className="player-lobby-status-queue">
                <p className="player-lobby-status-count">{queueLabel}</p>
                {waitingPosition != null ? (
                  <p className="player-lobby-status-position">You&apos;re #{waitingPosition}</p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
