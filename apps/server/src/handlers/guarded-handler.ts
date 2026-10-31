/**
 * Wraps a socket event handler so one bad message cannot crash the server.
 *
 * Socket.IO does not catch exceptions thrown by event handlers, and Node ends the
 * process on an unhandled promise rejection. A single malformed message from one
 * phone could therefore take down every game held in memory. The wrapper catches
 * synchronous throws and async rejections, logs which handler failed, and lets the
 * caller tell the client. It never throws.
 */
export function guarded<A extends unknown[]>(
  label: string,
  handler: (...args: A) => unknown,
  onError?: (error: unknown) => void
): (...args: A) => void {
  const fail = (error: unknown) => {
    console.error(`[${label}] handler failed:`, error)
    try {
      onError?.(error)
    } catch (reporterError) {
      console.error(`[${label}] error reporter failed:`, reporterError)
    }
  }

  return (...args: A) => {
    try {
      const result = handler(...args)
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        void Promise.resolve(result).catch(fail)
      }
    } catch (error) {
      fail(error)
    }
  }
}
