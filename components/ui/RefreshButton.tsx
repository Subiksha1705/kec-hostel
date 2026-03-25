'use client'

import { useEffect, useMemo, useState } from 'react'

type RefreshButtonProps = {
  onRefresh: () => Promise<void> | void
  fetchedAt?: number | null
  label?: string
}

function formatUpdated(fetchedAt: number | null, now: number) {
  if (!fetchedAt) return null
  const diffMs = Math.max(0, now - fetchedAt)
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Updated just now'
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Updated ${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `Updated ${diffDays}d ago`
}

export default function RefreshButton({ onRefresh, fetchedAt = null, label = 'Refresh' }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const updatedLabel = useMemo(() => formatUpdated(fetchedAt, now), [fetchedAt, now])

  const handleClick = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setNow(Date.now())
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {updatedLabel ? (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{updatedLabel}</span>
      ) : null}
      <button
        onClick={handleClick}
        disabled={isRefreshing}
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface-2)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          padding: '8px 12px',
          borderRadius: 'var(--radius)',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transformOrigin: '50% 50%',
              animation: isRefreshing ? 'refresh-spin 1s linear infinite' : 'none',
            }}
          >
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 4v6h-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {label}
      </button>
      <style jsx>{`
        @keyframes refresh-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
