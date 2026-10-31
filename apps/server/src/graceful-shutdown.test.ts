import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installGracefulShutdown, type ShutdownProcess } from './graceful-shutdown'

function fakeProc() {
  let handler: (() => void) | undefined
  const exit = vi.fn()
  const proc: ShutdownProcess = { once: (_e, l) => void (handler = l), exit }
  return { proc, exit, fire: () => handler?.() }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('installGracefulShutdown', () => {
  it('runs the save and then exits cleanly on SIGTERM', async () => {
    const { proc, exit, fire } = fakeProc()
    const save = vi.fn(async () => {})
    installGracefulShutdown(save, { proc, log: () => {} })
    fire()
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('still exits when the save fails', async () => {
    const { proc, exit, fire } = fakeProc()
    const log = vi.fn()
    installGracefulShutdown(async () => { throw new Error('db down') }, { proc, log })
    fire()
    await vi.advanceTimersByTimeAsync(0)
    expect(log).toHaveBeenCalledWith('[shutdown] save failed', expect.any(Error))
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('gives up on a save that never finishes', async () => {
    const { proc, exit, fire } = fakeProc()
    installGracefulShutdown(() => new Promise<void>(() => {}), { proc, maxWaitMs: 3000, log: () => {} })
    fire()
    await vi.advanceTimersByTimeAsync(2999)
    expect(exit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(exit).toHaveBeenCalledWith(0)
  })
})
