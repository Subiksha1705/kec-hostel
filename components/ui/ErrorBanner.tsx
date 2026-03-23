'use client'

export default function ErrorBanner({
  message,
  variant = 'error',
  onClose,
}: {
  message: string
  variant?: 'error' | 'info' | 'success'
  onClose?: () => void
}) {
  const styles =
    variant === 'success'
      ? { bg: 'var(--success)', color: 'var(--success-text)', border: 'var(--success-border)' }
      : variant === 'info'
        ? { bg: 'var(--info)', color: 'var(--info-text)', border: 'var(--info-border)' }
        : { bg: 'var(--error)', color: 'var(--error-text)', border: 'var(--error-border)' }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        padding: '10px 12px',
        borderRadius: 'var(--radius)',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      <div>{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: styles.color,
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
