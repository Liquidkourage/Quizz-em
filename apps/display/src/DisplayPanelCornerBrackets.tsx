import { WELCOME_WALL_ASSETS } from './welcomeWallAssets'

type DisplayPanelCornerBracketsProps = {
  cornersClassName?: string
  bracketClassName?: string
  bottomFlipClassName?: string
}

/** Ornate gold corner brackets — bottom row reuses top positioning inside a Y-flipped wrapper. */
export default function DisplayPanelCornerBrackets({
  cornersClassName = 'welcome-panel-corners',
  bracketClassName = 'welcome-bracket-corner pointer-events-none absolute select-none',
  bottomFlipClassName = 'welcome-panel-corners-bottom',
}: DisplayPanelCornerBracketsProps) {
  return (
    <div className={cornersClassName} aria-hidden>
      <img
        src={WELCOME_WALL_ASSETS.bracketCornerLeft}
        alt=""
        className={`${bracketClassName} welcome-bracket-corner--tl`}
        decoding="async"
        draggable={false}
      />
      <img
        src={WELCOME_WALL_ASSETS.bracketCornerRight}
        alt=""
        className={`${bracketClassName} welcome-bracket-corner--tr`}
        decoding="async"
        draggable={false}
      />
      <div className={bottomFlipClassName}>
        <img
          src={WELCOME_WALL_ASSETS.bracketCornerLeft}
          alt=""
          className={`${bracketClassName} welcome-bracket-corner--tl`}
          decoding="async"
          draggable={false}
        />
        <img
          src={WELCOME_WALL_ASSETS.bracketCornerRight}
          alt=""
          className={`${bracketClassName} welcome-bracket-corner--tr`}
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  )
}
