import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule, PlayerGoldPanel } from './PlayerGoldChrome'

function bustedPlayerName(name: string): string {
  const who = name.trim()
  return who || 'You'
}

export function EliminatedNotice({ name }: { name: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
      <p className="player-game-eliminated-name">{bustedPlayerName(name)}</p>
      <p className="player-game-eliminated-title">Out of chips</p>
    </motion.div>
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
              <EliminatedNotice name="" />
            </PlayerGoldPanel>
          </div>
        </PlayerGameShell>
      </div>
    </PlayerGameScreen>
  )
}
