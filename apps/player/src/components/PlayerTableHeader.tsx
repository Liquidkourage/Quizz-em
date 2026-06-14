import { QuizzEmWordmark } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

type PlayerTableHeaderProps = {
  gameState: GameState
  playerName: string
  myIndex: number
  answerPoints: number
  disconnected?: boolean
}

export default function PlayerTableHeader({
  gameState,
  playerName,
  myIndex,
  answerPoints,
  disconnected,
}: PlayerTableHeaderProps) {
  const showSeat = (gameState.tableId ?? '') !== LOBBY_TABLE_ID && myIndex >= 0
  const wageringRound = gameState.round.bettingRound ?? 0
  const boardHidden =
    gameState.phase === 'betting' && wageringRound === 1 && gameState.round.communityCards.length === 0

  return (
    <header className="mb-4 text-center sm:mb-6">
      <div className="mb-3 flex justify-center">
        <div className="w-[clamp(5rem,28vw,8rem)]">
          <QuizzEmWordmark layout="fill" />
        </div>
      </div>
      {disconnected ? (
        <p className="mb-2 text-sm font-semibold text-red-400">Reconnecting…</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white sm:text-base">
        <span>
          Venue <span className="font-bold text-casino-emerald">{gameState.code}</span>
        </span>
        <span className="text-white/35">·</span>
        <span>
          Table <span className="font-bold text-casino-gold">{gameState.tableId ?? '1'}</span>
        </span>
        {showSeat ? (
          <>
            <span className="text-white/35">·</span>
            <span>
              Seat <span className="font-bold text-casino-gold">{myIndex + 1}</span>
            </span>
          </>
        ) : null}
        <span className="text-white/35">·</span>
        <span>
          Trivia <span className="font-bold text-casino-emerald">{answerPoints}</span>
        </span>
        <span className="w-full basis-full text-white/35 sm:hidden" />
        <span className="font-semibold text-casino-gold">{playerName}</span>
      </div>
      <div className="mt-2 inline-block rounded-lg border border-white/20 bg-white/10 p-2 backdrop-blur-md sm:mt-3 sm:p-3">
        <div className="text-[11px] uppercase tracking-wide text-white/80 sm:text-xs">Phase</div>
        <div className="text-base font-bold capitalize text-casino-emerald sm:text-lg">{gameState.phase}</div>
        {gameState.phase === 'betting' ? (
          <div className="mt-2 border-t border-white/10 pt-2 text-left text-[11px] text-white/75 sm:text-sm">
            Wager rnd <span className="font-bold text-casino-gold">{wageringRound || '—'}</span>
            {boardHidden ? (
              <div className="mt-1 text-[10px] text-white/60 sm:text-xs">Board hidden until flop is dealt.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
