import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Shared gold casino backdrop + panel chrome for player screens. */

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

export function PlayerGameScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`player-join-screen player-game-screen${className ? ` ${className}` : ''}`}>
      <PlayerGoldBackdrop />
      {children}
    </div>
  )
}

export function PlayerGameShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`player-join-shell player-game-shell${className ? ` ${className}` : ''}`}>
      <PlayerGoldShellCorners />
      {children}
    </div>
  )
}

type PlayerGoldPanelProps = {
  title?: string
  className?: string
  children: ReactNode
}

export function PlayerGoldPanel({ title, className, children }: PlayerGoldPanelProps) {
  return (
    <section className={`player-game-panel${className ? ` ${className}` : ''}`}>
      {title ? <h2 className="player-game-panel-title">{title}</h2> : null}
      {children}
    </section>
  )
}

type PlayerGameButtonVariant = 'gold' | 'dark' | 'fold' | 'allin'

type PlayerGameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PlayerGameButtonVariant
  size?: 'normal' | 'large'
}

export function PlayerGameButton({
  variant = 'gold',
  size = 'normal',
  className,
  type = 'button',
  ...props
}: PlayerGameButtonProps) {
  const sizeClass = size === 'large' ? 'player-game-btn--lg' : ''
  return (
    <button
      type={type}
      className={`player-game-btn player-game-btn--${variant} ${sizeClass}${className ? ` ${className}` : ''}`}
      {...props}
    />
  )
}
