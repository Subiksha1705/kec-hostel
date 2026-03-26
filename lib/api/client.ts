export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status !== 401 || typeof window === 'undefined') return res

  // Try one refresh cycle for expired access tokens.
  try {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {}),
      },
    })
    if (!refreshRes.ok) return res
    const refreshData = await refreshRes.json().catch(() => null)
    const nextToken = refreshData?.data?.accessToken
    if (nextToken) {
      localStorage.setItem('accessToken', nextToken)
    }
  } catch {
    return res
  }

  const retryToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  return fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(retryToken ? { Authorization: `Bearer ${retryToken}` } : {}),
      ...options.headers,
    },
  })
}

export async function apiJson<T = unknown>(path: string, options: RequestInit = {}) {
  const res = await apiFetch(path, options)
  const data = await res.json().catch(() => null)
  return { res, data: data as T | null }
}
