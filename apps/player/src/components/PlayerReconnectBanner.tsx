import type { SocketConnectionStatus } from '@qhe/net'
import { PlayerGameButton } from './PlayerGoldChrome'

type PlayerReconnectBannerProps = {
  disconnected: boolean
  connectionStatus?: SocketConnectionStatus
  lastTableId?: string
  onReconnect: () => void
}

export function PlayerReconnectBanner({
  disconnected,
  connectionStatus = 'disconnected',
  lastTableId,
  onReconnect,
}: PlayerReconnectBannerProps) {
  if (!disconnected) return null

  const reconnecting = connectionStatus === 'reconnecting'
  const copy = reconnecting
    ? lastTableId
      ? `Reconnecting… you were at table ${lastTableId}. Hang tight, or tap to force rejoin.`
      : 'Reconnecting to the venue… hang tight, or tap to force rejoin.'
    : lastTableId
      ? `Connection lost — you were at table ${lastTableId}. Tap to rejoin.`
      : 'Connection lost — tap to rejoin the venue.'

  return (
    <div className="player-reconnect-banner" role="status">
      <p className="player-reconnect-banner-text">{copy}</p>
      <PlayerGameButton variant="gold" size="normal" className="player-game-btn--block" onClick={onReconnect}>
        {reconnecting ? 'Force rejoin' : 'Rejoin now'}
      </PlayerGameButton>
    </div>
  )
}
