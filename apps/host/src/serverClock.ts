/**
 * Skew-aware "now" that follows server wall time.
 * The public TVs already do this. The host desk reads the same stamp
 * so a laptop clock that runs a second or two off does not disagree with the room.
 */

let serverClockSkewMs = 0
let hasSample = false

export function recordServerClockSample(serverNowMs: number | null | undefined): void {
  if (typeof serverNowMs !== 'number' || !Number.isFinite(serverNowMs)) return
  const sampleSkew = serverNowMs - Date.now()
  if (!hasSample) {
    serverClockSkewMs = sampleSkew
    hasSample = true
    return
  }
  const alpha = 0.2
  serverClockSkewMs = serverClockSkewMs * (1 - alpha) + sampleSkew * alpha
}

export function nowOnServerClock(): number {
  return Date.now() + serverClockSkewMs
}

export function clearServerClockSample(): void {
  serverClockSkewMs = 0
  hasSample = false
}
