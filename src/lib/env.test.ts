import { describe, expect, it } from 'vitest'
import { parseClientEnv } from './env'

describe('parseClientEnv', () => {
  it('accepts valid client env', () => {
    const result = parseClientEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-1234567890',
    })

    expect(result.VITE_SUPABASE_URL).toBe('https://example.supabase.co')
  })

  it('rejects invalid client env', () => {
    expect(() => parseClientEnv({
      VITE_SUPABASE_URL: 'bad-url',
      VITE_SUPABASE_ANON_KEY: 'short',
    })).toThrow()
  })
})

