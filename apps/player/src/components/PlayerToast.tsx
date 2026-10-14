import { AnimatePresence, motion } from 'framer-motion'
import { ChipText } from '@qhe/ui'

type PlayerToastProps = {
  message: string | null
}

export default function PlayerToast({ message }: PlayerToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          className="player-game-toast"
          style={{
            top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
          }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <ChipText text={message} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
