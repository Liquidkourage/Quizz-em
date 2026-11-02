import { advanceScoresWatch, emptyScoresWatch, noteScoresView, scoresCue, type ScoresWatch } from '@qhe/core'

const scoresWatchByVenue = new Map<string, ScoresWatch>()

function watchFor(venueCode: string): ScoresWatch {
  return scoresWatchByVenue.get(venueCode) ?? emptyScoresWatch()
}

export function noteVenuePublicScores(venueCode: string, wallView: string): void {
  const prev = watchFor(venueCode)
  const next = noteScoresView(prev, wallView)
  if (next !== prev) scoresWatchByVenue.set(venueCode, next)
}

export function venueScoresCue(venueCode: string): { hint: string | null; blocked: boolean } {
  return scoresCue(watchFor(venueCode))
}

export function commitVenueScoresOnQuestion(venueCode: string): void {
  scoresWatchByVenue.set(venueCode, advanceScoresWatch(watchFor(venueCode)))
}

export function clearVenueScoresWatch(venueCode: string): void {
  scoresWatchByVenue.delete(venueCode)
}
