import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule, PlayerGoldPanel } from './PlayerGoldChrome'

export function EliminatedNotice() {
  return (
    <motion.p
      className="player-game-eliminated-title"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      Players who busted this hand
    </motion.p>
  )
}

export default function EliminatedScreen() {
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
          <div className="player-game-eliminated-body">
            <PlayerGoldPanel>
              <EliminatedNotice />
            </PlayerGoldPanel>
          </div>
        </PlayerGameShell>
      </div>
    </PlayerGameScreen>
  )
}
