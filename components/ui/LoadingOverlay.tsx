'use client'

export default function LoadingOverlay({
  label = 'Loading...',
  visible,
}: {
  label?: string
  visible: boolean
}) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid var(--brand-light)',
            borderTopColor: 'var(--brand)',
            animation: 'spin 0.9s linear infinite',
          }}
        />
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{label}</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
