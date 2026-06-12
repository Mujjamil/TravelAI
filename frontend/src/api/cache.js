/**
 * TTL-based in-memory cache for GET requests.
 * Prevents redundant network calls for repeated searches within a session.
 */

const store = new Map()

export const cache = {
  get(key) {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      store.delete(key)
      return null
    }
    return entry.value
  },

  set(key, value, ttlMs = 300_000) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  },

  delete(key) {
    store.delete(key)
  },

  clear() {
    store.clear()
  },
}
