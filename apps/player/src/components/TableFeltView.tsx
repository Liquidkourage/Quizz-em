import TableStatusHud from './TableStatusHud'
import type { GameState } from '@qhe/core'

type TableFeltViewProps = {
  gameState: GameState
  playerName: string
  /** Stable id — preferred over name when marking the You row. */
  myPlayerId?: string | null
  myIndex?: number
  /** When false, pot is shown elsewhere (e.g. sticky question bar). */
  showCenterPot?: boolean
  /** Drop panel title; HUD fills remaining viewport height. */
  fillViewport?: boolean
  turnRemainingSec?: number | null
  playerOnline?: Record<string, boolean>
}

/** Seated table view — compact status HUD (not a mini TV stadium). */
export default function TableFeltView(props: TableFeltViewProps) {
  return <TableStatusHud {...props} />
}
