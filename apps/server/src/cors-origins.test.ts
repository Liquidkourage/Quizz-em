import { describe, expect, it } from 'vitest'
import { resolveAllowedOrigins } from './cors-origins'

describe('resolveAllowedOrigins', () => {
  it('allows any origin when ALLOWED_ORIGINS is unset, empty or only commas', () => {
    expect(resolveAllowedOrigins({})).toBe('*')
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: '' })).toBe('*')
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: ' , ,' })).toBe('*')
  })

  it('splits a comma-separated list, trimming spaces and trailing slashes', () => {
    expect(resolveAllowedOrigins({ ALLOWED_ORIGINS: 'https://a.example.com/, https://b.example.com ' })).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ])
  })
})
