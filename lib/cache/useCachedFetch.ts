'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache } from './store'

export type UseCachedFetchResult<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  fetchedAt: number | null
}

type ApiResponse<T> = { ok: boolean; data: T; error?: string }

const inflight = new Map<string, Promise<unknown>>()

export function useCachedFetch<T>(key: string, fetcher?: () => Promise<T>): UseCachedFetchResult<T> {
  const initialEntry = key ? cache.get<T>(key) : null
  const mountedRef = useRef(true)
  const [data, setData] = useState<T | null>(initialEntry?.data ?? null)
  const [loading, setLoading] = useState(!initialEntry)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(initialEntry?.fetchedAt ?? null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const defaultFetch = useCallback(async (): Promise<T> => {
    const { data: response } = await apiJson<ApiResponse<T>>(key)
    if (!response?.ok) {
      throw new Error(response?.error ?? 'Failed to load data')
    }
    return response.data
  }, [key])

  const refresh = useCallback(async () => {
    if (!key) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    let promise = inflight.get(key) as Promise<T> | undefined
    if (!promise) {
      const loader = fetcher ?? defaultFetch
      promise = loader().finally(() => inflight.delete(key)) as Promise<T>
      inflight.set(key, promise)
    }

    try {
      const nextData = await promise
      const entry = cache.set(key, nextData)
      if (!mountedRef.current) return
      setData(nextData)
      setFetchedAt(entry.fetchedAt)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      if (!mountedRef.current) return
      setLoading(false)
    }
  }, [defaultFetch, fetcher, key])

  useEffect(() => {
    if (!key) {
      setLoading(false)
      return
    }
    const entry = cache.get<T>(key)
    if (entry) {
      setData(entry.data)
      setFetchedAt(entry.fetchedAt)
      setLoading(false)
      return
    }
    refresh()
  }, [key, refresh])

  return { data, loading, error, refresh, fetchedAt }
}
