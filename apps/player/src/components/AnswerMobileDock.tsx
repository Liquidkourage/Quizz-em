import { PlayerGameButton } from './PlayerGoldChrome'

type AnswerMobileDockProps = {
  remainingSec: number | null
  canSubmit: boolean
  onClear: () => void
  onSubmit: () => void
}

export default function AnswerMobileDock({ remainingSec, canSubmit, onClear, onSubmit }: AnswerMobileDockProps) {
  return (
    <div className="player-game-dock max-lg:block lg:hidden">
      <div className="player-game-dock-inner">
        <p className="player-game-timer">
          Time left: <strong>{remainingSec != null ? `${remainingSec}s` : 'Waiting'}</strong>
        </p>
        <div className="player-game-actions" style={{ marginTop: '0.55rem' }}>
          <PlayerGameButton variant="fold" onClick={onClear}>
            Clear
          </PlayerGameButton>
          <PlayerGameButton variant="gold" onClick={onSubmit} disabled={!canSubmit}>
            Submit
          </PlayerGameButton>
        </div>
      </div>
    </div>
  )
}
