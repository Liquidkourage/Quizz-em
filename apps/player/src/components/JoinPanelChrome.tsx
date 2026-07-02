import { JOIN_SCREEN_ASSETS } from '../joinScreenAssets'

/** Ornate gold corner brackets for the join card. */
export function JoinPanelCornerBrackets() {
  const bracketClass = 'player-join-bracket pointer-events-none absolute select-none'

  return (
    <>
      <img
        src={JOIN_SCREEN_ASSETS.bracketCornerLeft}
        alt=""
        aria-hidden
        className={`${bracketClass} player-join-bracket--tl`}
        decoding="async"
        draggable={false}
      />
      <img
        src={JOIN_SCREEN_ASSETS.bracketCornerRight}
        alt=""
        aria-hidden
        className={`${bracketClass} player-join-bracket--tr`}
        decoding="async"
        draggable={false}
      />
      <div className="player-join-brackets-bottom" aria-hidden>
        <img
          src={JOIN_SCREEN_ASSETS.bracketCornerLeft}
          alt=""
          aria-hidden
          className={`${bracketClass} player-join-bracket--tl`}
          decoding="async"
          draggable={false}
        />
        <img
          src={JOIN_SCREEN_ASSETS.bracketCornerRight}
          alt=""
          aria-hidden
          className={`${bracketClass} player-join-bracket--tr`}
          decoding="async"
          draggable={false}
        />
      </div>
    </>
  )
}

export function JoinGoldDivider() {
  return <div aria-hidden className="player-join-section-rule" />
}

export function JoinGoldDiamond() {
  return <span aria-hidden className="player-join-gold-diamond" />
}
