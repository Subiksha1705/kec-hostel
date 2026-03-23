'use client'

import { useEffect, useState } from 'react'

type Props = {
  message: string
  variant?: 'success' | 'error' | 'info'
  onClose: () => void
}

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const COLORS = {
  success: { bg: 'var(--mint)', color: '#1a5c3a', border: '#6bc49a' },
  error: { bg: 'var(--rose)', color: '#7a2020', border: '#d88888' },
  info: { bg: 'var(--sky)', color: '#1a3a5c', border: '#88b8d8' },
}

export default function Toast({ message, variant = 'success', onClose }: Props) {
  const [visible, setVisible] = useState(true)
  const c = COLORS[variant]

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 3200)
    const close = setTimeout(() => onClose(), 3500)
    return () => {
      clearTimeout(hide)
      clearTimeout(close)
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
        border: `1px solid ${c.border}`,
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-md)',
        fontWeight: 500,
        fontSize: '14px',
        zIndex: 9999,
        maxWidth: '360px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'all',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '16px' }}>{ICONS[variant]}</span>
      <span>{message}</span>
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(onClose, 300)
        }}
        style={{
          marginLeft: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: c.color,
          fontSize: '16px',
          opacity: 0.6,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  )
}
