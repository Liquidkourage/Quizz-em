import { motion } from 'framer-motion'
import { PokerChip } from '@qhe/ui'

export default function ConnectingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-casino-gradient px-4">
      <div className="player-shell text-center">
        <motion.h1
          className="mb-8 flex items-center justify-center gap-2 text-4xl font-black text-casino-emerald sm:text-6xl"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PokerChip size="lg" />
          Quizz&apos;em
        </motion.h1>
        <motion.p className="text-xl text-white/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          Connecting to server…
        </motion.p>
      </div>
    </div>
  )
}
