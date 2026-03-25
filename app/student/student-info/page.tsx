'use client'

import { useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'

type StudentInfo = {
  id: string
  name: string
  email: string
  rollNumber: string
  class?: { id: string; name: string } | null
  hostel?: {
    id: string
    name: string
    location: string
    capacity: number
    description?: string | null
    rules?: string | null
  } | null
}

export default function StudentInfoPage() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<StudentInfo>('/api/student-info')

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading student info...</div>
  }

  if (!data) {
    return <div style={{ color: 'var(--text-secondary)' }}>No student info available.</div>
  }

  const hostel = data.hostel
  const rules = hostel?.rules ? hostel.rules.split('\n').filter((line) => line.trim()) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Student Information
        </h1>
        <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { label: 'Name', value: data.name },
          { label: 'Email', value: data.email },
          { label: 'Roll Number', value: data.rollNumber },
          { label: 'Class', value: data.class?.name ?? 'Not assigned' },
          { label: 'Hostel', value: hostel?.name ?? 'Not assigned' },
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

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { label: 'Hostel Location', value: hostel?.location ?? 'Not available' },
          { label: 'Hostel Capacity', value: hostel ? `${hostel.capacity} students` : 'Not available' },
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
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Hostel Description</div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {hostel?.description || 'No description provided yet.'}
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
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Hostel Rules</div>
          {rules.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>No rules provided yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
