import { WELCOME_WALL_ASSETS } from './welcomeWallAssets'

/** Reusable ornate gold corner brackets (welcome wall + seating chart cards). */
export function DisplayVenuePanelCornerBrackets() {
  const bracketClass = 'welcome-bracket-corner pointer-events-none absolute select-none'

  return (
    <>
      <img
        src={WELCOME_WALL_ASSETS.bracketCornerLeft}
        alt=""
        aria-hidden
        className={`${bracketClass} welcome-bracket-corner--tl`}
        decoding="async"
        draggable={false}
      />
      <img
        src={WELCOME_WALL_ASSETS.bracketCornerRight}
        alt=""
        aria-hidden
        className={`${bracketClass} welcome-bracket-corner--tr`}
        decoding="async"
        draggable={false}
      />
      <div className="welcome-panel-corners-bottom" aria-hidden>
        <img
          src={WELCOME_WALL_ASSETS.bracketCornerLeft}
          alt=""
          aria-hidden
          className={`${bracketClass} welcome-bracket-corner--tl`}
          decoding="async"
          draggable={false}
        />
        <img
          src={WELCOME_WALL_ASSETS.bracketCornerRight}
          alt=""
          aria-hidden
          className={`${bracketClass} welcome-bracket-corner--tr`}
          decoding="async"
          draggable={false}
        />
      </div>
    </>
  )
}

export function DisplayVenueLabelRule({ children }: { children: string }) {
  return (
    <div className="welcome-label-rule">
      <span className="welcome-label-rule-text">{children}</span>
    </div>
  )
}
