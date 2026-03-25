export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const isAuthRequest = path.startsWith('/api/auth/')
  if (res.status === 401 && !isAuthRequest) {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  return res
}

export async function apiJson<T = unknown>(path: string, options: RequestInit = {}) {
  const res = await apiFetch(path, options)
  const data = await res.json().catch(() => null)
  return { res, data: data as T | null }
}
