/**
 * Skew-aware "now" reading that follows server wall time.
 *
 * The server stamps `serverNowMs` on outgoing snapshots. When the display
 * receives one, it captures its own `Date.now()` at that moment and tracks
 * the delta. Countdowns read `nowOnServerClock()` instead of `Date.now()`
 * so a client whose clock trails the server by 2–3 seconds doesn't see the
 * 45-second answer timer start at 47–48.
 *
 * We low-pass the samples to ignore single-snapshot jitter caused by
 * network latency or render hiccups.
 */

let serverClockSkewMs = 0
let hasSample = false

/**
 * Record a fresh server-time sample taken from a snapshot just received from the server.
 * `serverNowMs` is the value the server stamped at emit, in its own clock.
 * The first sample seeds the offset directly; subsequent samples are smoothed.
 */
export function recordServerClockSample(serverNowMs: number | null | undefined): void {
  if (typeof serverNowMs !== 'number' || !Number.isFinite(serverNowMs)) return
  const sampleSkew = serverNowMs - Date.now()
  if (!hasSample) {
    serverClockSkewMs = sampleSkew
    hasSample = true
    return
  }
  /** ~20% weight — enough to track drift in a long-running display while ignoring per-message latency spikes. */
  const alpha = 0.2
  serverClockSkewMs = serverClockSkewMs * (1 - alpha) + sampleSkew * alpha
}

/** Returns the best estimate of the server's `Date.now()` reading right now. */
export function nowOnServerClock(): number {
  return Date.now() + serverClockSkewMs
}

/** True once we've received at least one server-time sample. */
export function hasServerClockSample(): boolean {
  return hasSample
}
