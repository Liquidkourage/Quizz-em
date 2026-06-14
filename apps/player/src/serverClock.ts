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

export function hasServerClockSample(): boolean {
  return hasSample
}
