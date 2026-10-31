import { describe, expect, it } from 'vitest'
import { resolveAllowedOrigins } from './cors-origins'

const LIST = 'https://a.example.com/, https://b.example.com '

describe('resolveAllowedOrigins', () => {
  it('allows any origin unless the enforce flag is exactly true', () => {
    expect(resolveAllowedOrigins({})).toBe('*')
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: LIST })).toBe('*')
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: LIST, ENFORCE_CORS_ALLOWLIST: 'false' })).toBe('*')
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: LIST, ENFORCE_CORS_ALLOWLIST: '1' })).toBe('*')
  })

  it('applies the list when the flag is on, trimming spaces and trailing slashes', () => {
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: LIST, ENFORCE_CORS_ALLOWLIST: ' TRUE ' })).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ])
  })

  it('stays open when the flag is on but no origin is listed', () => {
    expect(resolveAllowedOrigins({ ENFORCE_CORS_ALLOWLIST: 'true' })).toBe('*')
    expect(resolveAllowedOrigins({ ENFORCE_CORS_ALLOWLIST: 'true', ALLOWED_ORIGINS: ' , ' })).toBe('*')
  })
})
