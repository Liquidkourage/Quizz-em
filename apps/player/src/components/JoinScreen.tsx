import { motion } from 'framer-motion'
import { Card, NeonButton, PokerChip } from '@qhe/ui'
import type { PlayerJoinPrefs } from '../playerUrlParams'

type JoinScreenProps = {
  prefs: PlayerJoinPrefs
  onChange: (next: PlayerJoinPrefs) => void
  onJoin: () => void
}

export default function JoinScreen({ prefs, onChange, onJoin }: JoinScreenProps) {
  const canJoin =
    prefs.playerName.trim().length > 0 &&
    prefs.roomCode.trim().length > 0 &&
    (prefs.autoSeat || prefs.tableId.trim().length > 0)

  return (
    <div className="min-h-screen bg-casino-gradient relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10 animate-float" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <Card variant="glass" className="w-full max-w-md p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mb-4 flex justify-center">
              <PokerChip size="lg" />
            </div>
            <h1 className="mb-2 text-3xl font-black text-casino-emerald">Join Quizz&apos;em</h1>
            <p className="mb-6 text-sm text-white/60">Enter the venue code from the host or TV screen.</p>
            <div className="space-y-4 text-left">
              <input
                type="text"
                placeholder="Your name"
                value={prefs.playerName}
                onChange={(e) => onChange({ ...prefs, playerName: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-white/60 backdrop-blur-md focus:border-casino-emerald focus:outline-none"
              />
              <input
                type="text"
                placeholder="Venue code"
                value={prefs.roomCode}
                onChange={(e) => onChange({ ...prefs, roomCode: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-white/60 backdrop-blur-md focus:border-casino-emerald focus:outline-none"
              />
              <label className="flex cursor-pointer items-start gap-3 text-sm text-white/90">
                <input
                  type="checkbox"
                  checked={prefs.autoSeat}
                  onChange={(e) => onChange({ ...prefs, autoSeat: e.target.checked })}
                  className="mt-1 rounded border-white/30"
                />
                <span>Join lobby — host auto-assigns my table when the round starts.</span>
              </label>
              {!prefs.autoSeat && (
                <input
                  type="text"
                  placeholder="Table number (e.g. 1)"
                  value={prefs.tableId}
                  onChange={(e) => onChange({ ...prefs, tableId: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-white/60 backdrop-blur-md focus:border-casino-emerald focus:outline-none"
                />
              )}
              <NeonButton variant="emerald" size="large" className="w-full" onClick={onJoin} disabled={!canJoin}>
                Join game
              </NeonButton>
            </div>
          </motion.div>
        </Card>
      </div>
    </div>
  )
}
