export interface ShutdownProcess {
  once(event: string, listener: () => void): unknown
  exit(code: number): never | void
}

/**
 * On SIGTERM (Railway sends it on every deploy) run `beforeExit`, then exit.
 * The wait is capped so a stuck save can never hold the process open.
 */
export function installGracefulShutdown(
  beforeExit: () => Promise<void>,
  opts: { proc?: ShutdownProcess; maxWaitMs?: number; log?: (message: string, error?: unknown) => void } = {},
): void {
  const proc: ShutdownProcess = opts.proc ?? process
  const maxWaitMs = opts.maxWaitMs ?? 5000
  const log = opts.log ?? ((message, error) => console.log(message, error ?? ''))
  proc.once('SIGTERM', () => {
    log('[shutdown] SIGTERM received, saving tables before exit')
    const giveUp = new Promise<void>((resolve) => {
      const t = setTimeout(resolve, maxWaitMs)
      t.unref?.()
    })
    void Promise.race([beforeExit().catch((error) => log('[shutdown] save failed', error)), giveUp]).finally(() =>
      proc.exit(0),
    )
  })
}
