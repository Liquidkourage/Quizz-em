import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, NeonButton, PokerChip } from '@qhe/ui'
import type { PlayerJoinBootstrap } from '../playerUrlParams'

type JoinScreenProps = {
  prefs: PlayerJoinBootstrap
  onChange: (next: PlayerJoinBootstrap) => void
  onJoin: () => void
  joinError?: string | null
  isConnecting?: boolean
}

export default function JoinScreen({
  prefs,
  onChange,
  onJoin,
  joinError = null,
  isConnecting = false,
}: JoinScreenProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  const canJoin =
    !isConnecting && prefs.playerName.trim().length > 0 && prefs.roomCode.trim().length > 0

  const focusName = prefs.roomFromUrl && !prefs.nameFromUrl && prefs.playerName.trim().length === 0

  useEffect(() => {
    if (!focusName) return
    nameInputRef.current?.focus()
  }, [focusName])

  function patch(next: Partial<PlayerJoinBootstrap>) {
    onChange({ ...prefs, ...next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canJoin) onJoin()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-casino-gradient">
      <div className="absolute inset-0">
        <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />
        <div className="absolute inset-0 animate-float bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <Card variant="glass" className="w-full max-w-md p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mb-4 flex justify-center">
              <PokerChip size="lg" />
            </div>
            <h1 className="mb-2 text-3xl font-black text-casino-emerald">Join Quizz&apos;em</h1>
            <p className="mb-6 text-sm text-white/60">
              Enter your name and venue code to join the game. The host seats you before the first hand.
            </p>

            <form className="space-y-4 text-left" onSubmit={handleSubmit}>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Your name"
                value={prefs.playerName}
                onChange={(e) => patch({ playerName: e.target.value })}
                autoComplete="nickname"
                className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-white/60 backdrop-blur-md focus:border-casino-emerald focus:outline-none"
              />
              <input
                type="text"
                placeholder="Venue code"
                value={prefs.roomCode}
                onChange={(e) => patch({ roomCode: e.target.value.toUpperCase() })}
                autoComplete="off"
                className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-white/60 backdrop-blur-md focus:border-casino-emerald focus:outline-none"
              />

              {joinError ? (
                <p className="rounded-lg border border-red-500/40 bg-red-950/35 px-3 py-2 text-sm leading-snug text-red-200">
                  {joinError}
                </p>
              ) : null}

              <NeonButton variant="emerald" size="large" className="w-full" type="submit" disabled={!canJoin}>
                {isConnecting ? 'Connecting…' : 'Join game'}
              </NeonButton>
            </form>
          </motion.div>
        </Card>
      </div>
    </div>
  )
}
