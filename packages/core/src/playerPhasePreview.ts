/** Cosmetic player-phone pictures. The live hand is not involved. */
export const PLAYER_PHASE_PREVIEWS = [
  { id: 'join', show: 'Show join', showing: 'Showing join' },
  { id: 'connecting', show: 'Show connecting', showing: 'Showing connecting' },
  { id: 'waiting', show: 'Show waiting room', showing: 'Showing the waiting room' },
  { id: 'table', show: 'Show the table', showing: 'Showing the table' },
  { id: 'question', show: 'Show the question', showing: 'Showing the question' },
  { id: 'turn', show: 'Show your turn', showing: 'Showing your turn' },
  { id: 'guess', show: 'Show your guess', showing: 'Showing your guess' },
  { id: 'guess-locked', show: 'Show guess sent', showing: 'Showing guess sent' },
  { id: 'folded', show: 'Show folded', showing: 'Showing folded' },
  { id: 'results', show: 'Show results', showing: 'Showing results' },
  { id: 'between', show: 'Show the next question', showing: 'Showing the next question' },
  { id: 'game-over', show: 'Show game over', showing: 'Showing game over' },
] as const

export type PlayerPhasePreviewId = (typeof PLAYER_PHASE_PREVIEWS)[number]['id']

const PREVIEW_IDS = new Set<string>(PLAYER_PHASE_PREVIEWS.map((scene) => scene.id))

/**
 * Cosmetic phone picture.
 * `null` clears it. `undefined` is not a screen the phone can show.
 */
export function parsePlayerPhasePreview(raw: unknown): PlayerPhasePreviewId | null | undefined {
  if (raw === null) return null
  if (typeof raw !== 'string' || !PREVIEW_IDS.has(raw)) return undefined
  return raw as PlayerPhasePreviewId
}

export function playerPhasePreviewCopy(id: PlayerPhasePreviewId): { show: string; showing: string } {
  const scene = PLAYER_PHASE_PREVIEWS.find((item) => item.id === id)
  return scene ?? PLAYER_PHASE_PREVIEWS[0]
}
