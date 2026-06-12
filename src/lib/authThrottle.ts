const AUTH_THROTTLE_KEY = 'mendjahit-auth-throttle-v1'
const DEFAULT_LIMIT = 5
const DEFAULT_LOCKOUT_MS = 60_000

type AuthThrottleEntry = {
  attempts: number
  lockoutUntil: number | null
}

type AuthThrottleStore = Record<string, AuthThrottleEntry>

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function readStore(): AuthThrottleStore {
  const storage = getStorage()
  if (!storage) return {}

  try {
    const raw = storage.getItem(AUTH_THROTTLE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as AuthThrottleStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: AuthThrottleStore) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(AUTH_THROTTLE_KEY, JSON.stringify(store))
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase() || '__anonymous__'
}

function getEntry(identifier: string, now = Date.now()) {
  const key = normalizeIdentifier(identifier)
  const store = readStore()
  const entry = store[key] || { attempts: 0, lockoutUntil: null }

  if (entry.lockoutUntil && entry.lockoutUntil <= now) {
    delete store[key]
    writeStore(store)
    return { key, store, entry: { attempts: 0, lockoutUntil: null } }
  }

  return { key, store, entry }
}

export function getAuthThrottleState(identifier: string, now = Date.now()) {
  const { entry } = getEntry(identifier, now)
  return {
    attempts: entry.attempts,
    lockoutUntil: entry.lockoutUntil,
    remainingMs: entry.lockoutUntil ? Math.max(0, entry.lockoutUntil - now) : 0,
    isLocked: Boolean(entry.lockoutUntil && entry.lockoutUntil > now),
  }
}

export function registerAuthFailure(
  identifier: string,
  now = Date.now(),
  limit = DEFAULT_LIMIT,
  lockoutMs = DEFAULT_LOCKOUT_MS,
) {
  const { key, store, entry } = getEntry(identifier, now)
  const nextAttempts = entry.attempts + 1
  const nextEntry: AuthThrottleEntry = {
    attempts: nextAttempts >= limit ? 0 : nextAttempts,
    lockoutUntil: nextAttempts >= limit ? now + lockoutMs : null,
  }

  store[key] = nextEntry
  writeStore(store)

  return getAuthThrottleState(identifier, now)
}

export function clearAuthThrottle(identifier: string) {
  const key = normalizeIdentifier(identifier)
  const store = readStore()
  if (!(key in store)) return
  delete store[key]
  writeStore(store)
}

