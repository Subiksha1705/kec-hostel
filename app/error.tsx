'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ display: 'grid', gap: '16px', padding: '24px' }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Something Went Wrong
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
          We hit an unexpected error. You are still signed in.
        </p>
      </div>
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          padding: '12px 14px',
          borderRadius: 'var(--radius)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
        }}
      >
        {error.message || 'Unexpected error'}
      </div>
      <button
        onClick={reset}
        style={{
          background: 'var(--sage)',
          color: 'white',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontWeight: 600,
          width: 'fit-content',
        }}
      >
        Try Again
      </button>
    </div>
  )
}
