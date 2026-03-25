type CacheEntry<T> = { data: T; ts: number }

const PREFIX = 'kec-cache:'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

export function getCache<T>(key: string): CacheEntry<T> | null {
  const storage = getStorage()
  if (!storage) return null
  const raw = storage.getItem(`${PREFIX}${key}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CacheEntry<T>
  } catch {
    storage.removeItem(`${PREFIX}${key}`)
    return null
  }
}

export function setCache<T>(key: string, data: T) {
  const storage = getStorage()
  if (!storage) return
  const entry: CacheEntry<T> = { data, ts: Date.now() }
  storage.setItem(`${PREFIX}${key}`, JSON.stringify(entry))
}

export function clearCache(key: string) {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(`${PREFIX}${key}`)
}

export function clearAllCache() {
  const storage = getStorage()
  if (!storage) return
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i)
    if (key && key.startsWith(PREFIX)) {
      storage.removeItem(key)
    }
  }
}
