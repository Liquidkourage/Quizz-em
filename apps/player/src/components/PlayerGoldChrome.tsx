/** Shared gold casino backdrop + panel chrome for player pre-game screens. */

export function PlayerGoldBackdrop() {
  return (
    <div className="player-join-bg" aria-hidden>
      <span className="player-join-suit player-join-suit--club">♣</span>
      <span className="player-join-suit player-join-suit--diamond">♦</span>
      <div className="player-join-floor-glow" />
    </div>
  )
}

export function PlayerGoldCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return <span aria-hidden className={`player-join-corner player-join-corner--${position}`} />
}

export function PlayerGoldDivider() {
  return <div aria-hidden className="player-join-divider" />
}

export function PlayerGoldHeaderRule() {
  return <div className="player-join-header-rule" aria-hidden />
}

export function PlayerGoldShellCorners() {
  return (
    <>
      <PlayerGoldCorner position="tl" />
      <PlayerGoldCorner position="tr" />
      <PlayerGoldCorner position="bl" />
      <PlayerGoldCorner position="br" />
    </>
  )
}
