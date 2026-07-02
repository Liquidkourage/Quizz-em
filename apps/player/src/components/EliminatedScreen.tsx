import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import { PlayerGameScreen, PlayerGameShell, PlayerGoldHeaderRule, PlayerGoldPanel } from './PlayerGoldChrome'

type EliminatedScreenProps = {
  playerName: string
}

export default function EliminatedScreen({ playerName }: EliminatedScreenProps) {
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
              <motion.h1
                className="player-game-eliminated-title"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Eliminated
              </motion.h1>
              <p className="player-game-eliminated-text">
                Your stack hit zero — you&apos;re out of the chip contest. Thanks for playing, {playerName}!
              </p>
              <p className="player-game-eliminated-foot">Watch the venue display for the rest of the show.</p>
            </PlayerGoldPanel>
          </div>
        </PlayerGameShell>
      </div>
    </PlayerGameScreen>
  )
}
