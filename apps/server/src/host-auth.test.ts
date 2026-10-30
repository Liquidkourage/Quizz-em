import { describe, expect, it } from 'vitest'
import { LOCAL_DEV_HOST_SECRET, hostHelloFailureMessage, requiredHostSecret } from './host-auth'

describe('host login', () => {
  it('uses HOST_SECRET when it is set', () => {
    const env = { HOST_SECRET: 'show-night', NODE_ENV: 'production', RAILWAY_ENVIRONMENT: 'production' }
    expect(requiredHostSecret(env)).toBe('show-night')
    expect(hostHelloFailureMessage('show-night', env)).toBeNull()
    expect(hostHelloFailureMessage('', env)).toBe('Invalid host credentials.')
    expect(hostHelloFailureMessage('other', env)).toBe('Invalid host credentials.')
  })

  it('refuses every host hello on a deployed server with no secret', () => {
    const env = { HOST_SECRET: '   ', NODE_ENV: 'production', RAILWAY_PROJECT_ID: 'proj' }
    expect(requiredHostSecret(env)).toBe('')
    expect(hostHelloFailureMessage('quizzem-local-host', env)).toBe('Host login is not configured on this server.')
    expect(hostHelloFailureMessage('', env)).toBe('Host login is not configured on this server.')
  })

  it('accepts the local dev secret when nothing is configured', () => {
    const env = { HOST_SECRET: '', NODE_ENV: 'development' }
    expect(requiredHostSecret(env)).toBe(LOCAL_DEV_HOST_SECRET)
    expect(hostHelloFailureMessage(LOCAL_DEV_HOST_SECRET, env)).toBeNull()
    expect(hostHelloFailureMessage('', env)).toBe('Invalid host credentials.')
  })
})
