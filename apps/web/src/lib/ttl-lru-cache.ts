/**
 * Caché en memoria por instancia serverless (TTL + tope de entradas).
 * No sustituye Redis; evita ráfagas repetidas a Neon/ES en la misma lambda.
 */
export class TtlLruCache<T> {
  private readonly store = new Map<string, { at: number; value: T }>()

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number
  ) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (Date.now() - hit.at >= this.ttlMs) {
      this.store.delete(key)
      return undefined
    }
    this.store.delete(key)
    this.store.set(key, hit)
    return hit.value
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) this.store.delete(key)
    this.store.set(key, { at: Date.now(), value })
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest === undefined) break
      this.store.delete(oldest)
    }
  }
}

export async function getOrLoadTtl<T>(
  cache: TtlLruCache<T>,
  key: string,
  load: () => Promise<T>
): Promise<{ value: T; cacheHit: boolean }> {
  const cached = cache.get(key)
  if (cached !== undefined) return { value: cached, cacheHit: true }
  const value = await load()
  cache.set(key, value)
  return { value, cacheHit: false }
}
