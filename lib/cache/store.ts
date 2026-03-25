type CacheEntry<T> = {
  data: T
  fetchedAt: number
  ttl: number
}

const DEFAULT_TTL = 5 * 60 * 1000

const MANUAL_ONLY_KEYS = new Set([
  '/api/leaves',
  '/api/complaints',
  '/api/roles',
  '/api/members',
  '/api/hostel-info',
  '/api/students',
  '/api/superadmin/colleges',
  '/api/permissions',
  '/api/dashboard',
])

const store = new Map<string, CacheEntry<unknown>>()

function isExpired(entry: CacheEntry<unknown>) {
  if (entry.ttl === 0) return false
  return Date.now() - entry.fetchedAt > entry.ttl
}

export const cache = {
  get<T>(key: string): CacheEntry<T> | null {
    const entry = store.get(key)
    if (!entry) return null
    if (isExpired(entry)) {
      store.delete(key)
      return null
    }
    return entry as CacheEntry<T>
  },
  set<T>(key: string, data: T, ttl?: number) {
    const resolvedTtl = typeof ttl === 'number' ? ttl : MANUAL_ONLY_KEYS.has(key) ? 0 : DEFAULT_TTL
    const entry: CacheEntry<T> = { data, fetchedAt: Date.now(), ttl: resolvedTtl }
    store.set(key, entry)
    return entry
  },
  invalidate(key: string) {
    store.delete(key)
  },
  clear() {
    store.clear()
  },
}
