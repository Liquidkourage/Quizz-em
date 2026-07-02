import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule } from './PlayerGoldChrome'

export default function ConnectingScreen() {
  return (
    <PlayerGameScreen>
      <div className="player-game-layout player-join-layout">
        <PlayerGameShell>
          <header className="player-join-header player-game-header">
            <div className="player-join-logo-glow" aria-hidden />
            <div className="player-join-logo">
              <QuizzEmWordmark layout="fill" depth="hero" />
            </div>
          </header>
          <PlayerGoldHeaderRule />
          <div className="player-game-connecting">
            <motion.h1
              className="player-game-connecting-title"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Connecting
            </motion.h1>
            <motion.p className="player-game-connecting-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              Syncing with the venue…
            </motion.p>
          </div>
        </PlayerGameShell>
      </div>
    </PlayerGameScreen>
  )
}
