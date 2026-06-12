import { afterEach, describe, expect, it } from 'vitest'
import { clearAuthThrottle, getAuthThrottleState, registerAuthFailure } from './authThrottle'

describe('authThrottle', () => {
  const identifier = 'user@example.com'

  afterEach(() => {
    clearAuthThrottle(identifier)
  })

  it('locks after limit reached', () => {
    const baseTime = 1_700_000_000_000

    for (let index = 0; index < 4; index += 1) {
      registerAuthFailure(identifier, baseTime + index)
    }

    const locked = registerAuthFailure(identifier, baseTime + 5)
    expect(locked.isLocked).toBe(true)
    expect(locked.remainingMs).toBeGreaterThan(0)
  })

  it('clears state after success', () => {
    registerAuthFailure(identifier)
    clearAuthThrottle(identifier)

    expect(getAuthThrottleState(identifier).attempts).toBe(0)
  })
})

