import { motion } from 'framer-motion'
import type { GameState, PlayerState } from '@qhe/core'
import type { ComposedAnswer, SelectedCardRef } from '../playerModel/answerComposition'
import AnswerComposer from './AnswerComposer'
import { PlayerGoldShellCorners } from './PlayerGoldChrome'

type AnswerComposerModalProps = {
  gameState: GameState
  currentPlayer: PlayerState
  composed: ComposedAnswer
  selectedCards: SelectedCardRef[]
  remainingSec: number | null
  onSelectCard: (type: 'hand' | 'community', index: number) => void
  onToggleDecimal: () => void
  onClear: () => void
  onSubmit: () => void
}

export default function AnswerComposerModal(props: AnswerComposerModalProps) {
  return (
    <div className="player-game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="answer-modal-title">
      <motion.div
        className="player-game-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-hidden
      />
      <motion.div
        className="player-game-modal-shell player-join-shell player-game-shell"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <PlayerGoldShellCorners />
        <div className="player-game-modal-body">
          <AnswerComposer {...props} />
        </div>
      </motion.div>
    </div>
  )
}
