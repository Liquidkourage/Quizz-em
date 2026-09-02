import { PlayerGameButton } from './PlayerGoldChrome'

type PlayerReconnectBannerProps = {
  disconnected: boolean
  lastTableId?: string
  onReconnect: () => void
}

export function PlayerReconnectBanner({
  disconnected,
  lastTableId,
  onReconnect,
}: PlayerReconnectBannerProps) {
  if (!disconnected) return null

  return (
    <div className="player-reconnect-banner" role="status">
      <p className="player-reconnect-banner-text">
        {lastTableId
          ? `Connection lost — you were at table ${lastTableId}. Tap to rejoin.`
          : 'Connection lost — tap to rejoin the venue.'}
      </p>
      <PlayerGameButton variant="gold" size="normal" className="player-game-btn--block" onClick={onReconnect}>
        Rejoin now
      </PlayerGameButton>
    </div>
  )
}
