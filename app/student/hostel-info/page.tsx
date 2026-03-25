'use client'

import { useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'

type HostelInfo = {
  name: string
  location: string
  capacity: number
  description?: string | null
  rules?: string | null
}

export default function StudentHostelInfoPage() {
  const { data: hostel, loading, refresh, fetchedAt } = useCachedFetch<HostelInfo>('/api/hostel-info')

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading hostel info...</div>
  }

  if (!hostel) {
    return <div style={{ color: 'var(--text-secondary)' }}>No hostel info available.</div>
  }

  const rules = hostel.rules ? hostel.rules.split('\n').filter((line) => line.trim()) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Hostel Information
        </h1>
        <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { label: 'Name', value: hostel.name },
          { label: 'Location', value: hostel.location },
          { label: 'Capacity', value: `${hostel.capacity} students` },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Description</div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {hostel.description || 'No description provided yet.'}
          </div>
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Rules</div>
          {rules.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              No rules provided yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
