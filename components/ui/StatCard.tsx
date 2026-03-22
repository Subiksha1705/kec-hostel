import React from 'react'

type StatCardProps = {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
        padding: '20px',
        position: 'relative',
      }}
    >
      {icon ? (
        <div style={{ position: 'absolute', right: '16px', top: '16px', opacity: 0.5 }}>
          {icon}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
          fontSize: '28px',
        }}
      >
        {value}
      </div>
      <div style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>
        {label}
      </div>
    </div>
  )
}
