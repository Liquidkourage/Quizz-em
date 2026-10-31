import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guarded } from './guarded-handler'

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('guarded', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes its arguments through to the handler', () => {
    const handler = vi.fn()
    guarded('test', handler)('a', 2)
    expect(handler).toHaveBeenCalledWith('a', 2)
  })

  it('does not throw when the handler throws', () => {
    const run = guarded('test', () => {
      throw new Error('boom')
    })
    expect(() => run()).not.toThrow()
  })

  it('does not leave a rejected promise behind when an async handler fails', async () => {
    const onError = vi.fn()
    guarded('test', async () => {
      throw new Error('late boom')
    }, onError)()
    await flush()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('reports the failure to the caller', () => {
    const onError = vi.fn()
    const boom = new Error('boom')
    guarded('test', () => {
      throw boom
    }, onError)()
    expect(onError).toHaveBeenCalledWith(boom)
  })

  it('logs which handler failed', () => {
    guarded('hello', () => {
      throw new Error('boom')
    })()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('hello'), expect.any(Error))
  })

  it('keeps working after a failure', () => {
    let calls = 0
    const run = guarded('test', () => {
      calls++
      if (calls === 1) throw new Error('first call fails')
    })
    run()
    run()
    expect(calls).toBe(2)
  })

  it('survives an error reporter that also throws', () => {
    const run = guarded(
      'test',
      () => {
        throw new Error('boom')
      },
      () => {
        throw new Error('reporter boom')
      }
    )
    expect(() => run()).not.toThrow()
  })

  it('does not report anything when the handler succeeds', async () => {
    const onError = vi.fn()
    guarded('test', async () => 'fine', onError)()
    await flush()
    expect(onError).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })
})
