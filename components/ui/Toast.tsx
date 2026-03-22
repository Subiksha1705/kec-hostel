'use client'

import { useEffect } from 'react'

type ToastProps = {
  message: string
  variant?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, variant = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors =
    variant === 'success'
      ? { background: 'var(--mint)', color: '#1a5c3a' }
      : { background: 'var(--rose)', color: '#7a2020' }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: colors.background,
        color: colors.color,
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-md)',
        fontWeight: 600,
        zIndex: 50,
      }}
    >
      {message}
    </div>
  )
}
