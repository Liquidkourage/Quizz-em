/**
 * Keeps the server running when something throws outside a socket handler.
 *
 * Node ends the process on an unhandled rejection or an uncaught exception, which would
 * drop every game held in memory in the middle of a live event. This logs loudly and stays
 * up. It is a stopgap: state may be inconsistent after an uncaught exception, so the log
 * line is what to watch for. Restart recovery is what makes a real restart survivable.
 */
interface ProcessLike {
  on(event: string, listener: (error: unknown) => void): unknown
  listenerCount(event: string): number
}

const GUARDED_EVENTS = ['unhandledRejection', 'uncaughtException'] as const

export function installProcessGuards(proc: ProcessLike = process): void {
  for (const event of GUARDED_EVENTS) {
    if (proc.listenerCount(event) > 0) continue
    proc.on(event, (error: unknown) => {
      console.error(`[${event}] kept the server running after:`, error)
    })
  }
}
