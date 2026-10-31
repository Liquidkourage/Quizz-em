export type ConnectedDisplay = { socketId: string; name: string }

const displaysByVenue = new Map<string, Map<string, ConnectedDisplay>>()
const venueBySocket = new Map<string, string>()

function venueKey(venueCode: string): string {
  return venueCode.trim().toUpperCase()
}

export function listConnectedDisplays(venueCode: string): ConnectedDisplay[] {
  const bucket = displaysByVenue.get(venueKey(venueCode))
  if (!bucket) return []
  return [...bucket.values()]
}

export function rememberConnectedDisplay(
  venueCode: string,
  socketId: string,
  name: string,
): ConnectedDisplay[] {
  const venue = venueKey(venueCode)
  const label = name.trim() || "Quizz'em TV"
  const previous = venueBySocket.get(socketId)
  if (previous && previous !== venue) {
    const oldBucket = displaysByVenue.get(previous)
    oldBucket?.delete(socketId)
    if (oldBucket && oldBucket.size === 0) displaysByVenue.delete(previous)
  }
  let bucket = displaysByVenue.get(venue)
  if (!bucket) {
    bucket = new Map()
    displaysByVenue.set(venue, bucket)
  }
  bucket.set(socketId, { socketId, name: label })
  venueBySocket.set(socketId, venue)
  return listConnectedDisplays(venue)
}

export function forgetConnectedDisplay(
  socketId: string,
): { venueCode: string; displays: ConnectedDisplay[] } | null {
  const venue = venueBySocket.get(socketId)
  if (!venue) return null
  venueBySocket.delete(socketId)
  const bucket = displaysByVenue.get(venue)
  bucket?.delete(socketId)
  if (bucket && bucket.size === 0) displaysByVenue.delete(venue)
  return { venueCode: venue, displays: listConnectedDisplays(venue) }
}

/** Drop one attached TV. Null when that socket is not on this venue. */
export function takeConnectedDisplay(venueCode: string, socketId: string): ConnectedDisplay | null {
  const venue = venueKey(venueCode)
  const row = displaysByVenue.get(venue)?.get(socketId)
  if (!row) return null
  forgetConnectedDisplay(socketId)
  return row
}

export function clearConnectedDisplays(): void {
  displaysByVenue.clear()
  venueBySocket.clear()
}
