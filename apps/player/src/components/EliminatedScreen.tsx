import { motion } from 'framer-motion'
import { Card } from '@qhe/ui'

type EliminatedScreenProps = {
  playerName: string
}

export default function EliminatedScreen({ playerName }: EliminatedScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-casino-gradient px-4">
      <Card variant="glass" className="player-shell p-8 text-center sm:p-10">
        <motion.h1
          className="text-4xl font-black text-red-400 sm:text-5xl"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Eliminated
        </motion.h1>
        <p className="mt-4 text-lg leading-relaxed text-white/80 sm:text-xl">
          Your stack hit zero — you&apos;re out of the chip contest. Thanks for playing, {playerName}!
        </p>
        <p className="mt-3 text-sm text-white/55 sm:text-base">Watch the venue display for the rest of the show.</p>
      </Card>
    </div>
  )
}
