import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { installProcessGuards } from './process-guards'

describe('installProcessGuards', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs an unhandled rejection instead of ending the process', () => {
    const proc = new EventEmitter()
    installProcessGuards(proc)
    const reason = new Error('late failure')
    expect(() => proc.emit('unhandledRejection', reason)).not.toThrow()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('unhandledRejection'), reason)
  })

  it('logs an uncaught exception instead of ending the process', () => {
    const proc = new EventEmitter()
    installProcessGuards(proc)
    const error = new Error('stray throw')
    expect(() => proc.emit('uncaughtException', error)).not.toThrow()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('uncaughtException'), error)
  })

  it('installs each handler once even if called twice', () => {
    const proc = new EventEmitter()
    installProcessGuards(proc)
    installProcessGuards(proc)
    expect(proc.listenerCount('unhandledRejection')).toBe(1)
    expect(proc.listenerCount('uncaughtException')).toBe(1)
  })
})
