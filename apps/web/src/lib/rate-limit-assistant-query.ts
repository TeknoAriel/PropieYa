/**
 * Rate limit en memoria para POST /api/assistant/query.
 */

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 30
const MAX_ENTRIES = 20_000

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

function prune(): void {
  const now = Date.now()
  if (store.size >= MAX_ENTRIES) {
    for (const [ip, entry] of store) {
      if (entry.resetAt < now) store.delete(ip)
      if (store.size < MAX_ENTRIES * 0.8) break
    }
  }
}

export function checkAssistantQueryRateLimit(ip: string): boolean {
  const now = Date.now()
  prune()

  const entry = store.get(ip)
  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_REQUESTS) {
    return false
  }
  entry.count++
  return true
}
