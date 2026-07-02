import { motion } from 'framer-motion'
import { Card, QuizzEmWordmark } from '@qhe/ui'

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
  return (
    <div className="relative min-h-screen overflow-hidden bg-casino-gradient">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />
        <div className="absolute inset-0 animate-float bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 w-[clamp(5rem,28vw,7rem)] lg:mb-8 lg:w-[clamp(7rem,18vw,10rem)]">
          <QuizzEmWordmark layout="fill" />
        </div>

        <Card variant="glass" className="player-shell w-full p-6 text-center sm:p-8 lg:p-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {disconnected ? (
              <p className="mb-3 text-sm font-semibold text-red-400">Reconnecting…</p>
            ) : null}
            <h1 className="text-2xl font-black leading-tight text-casino-emerald sm:text-3xl">
              You&apos;re in — waiting to be seated
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              Host seats you before the first hand.
            </p>

            <div className="mt-6 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-4">
              <p className="text-sm text-white/80">
                <span className="text-white/55">Playing as </span>
                <span className="font-bold text-white">{playerName}</span>
              </p>
              <p className="text-sm text-white/80">
                <span className="text-white/55">Venue </span>
                <span className="font-mono font-bold tracking-wide text-casino-gold">{venueCode}</span>
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-200">
                {waitingCount} {waitingCount === 1 ? 'player' : 'players'} waiting to be seated
                {waitingPosition != null ? (
                  <span className="mt-1 block text-sm font-semibold text-white/65">
                    You&apos;re #{waitingPosition}
                  </span>
                ) : null}
              </p>
            </div>
          </motion.div>
        </Card>
      </div>
    </div>
  )
}
