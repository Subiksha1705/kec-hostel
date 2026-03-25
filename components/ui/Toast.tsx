'use client'

import { useEffect, useState } from 'react'

type ToastProps = {
  message: string
  variant?: 'success' | 'error' | 'info'
  onClose: () => void
}

const CONFIG = {
  success: { bg: 'var(--mint)', color: '#1a5c3a', icon: '✓' },
  error: { bg: 'var(--rose)', color: '#7a2020', icon: '✕' },
  info: { bg: 'var(--sky, #b8d4e8)', color: '#1a3a5c', icon: 'ℹ' },
}

export default function Toast({ message, variant = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)
  const c = CONFIG[variant]

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 3200)
    const t2 = setTimeout(onClose, 3500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: c.bg,
        color: c.color,
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-md)',
        fontWeight: 500,
        fontSize: '14px',
        zIndex: 9999,
        maxWidth: '360px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <span style={{ fontWeight: 700 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(onClose, 300)
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: c.color,
          fontSize: '14px',
          opacity: 0.7,
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
