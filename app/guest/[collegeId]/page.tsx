'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiJson } from '@/lib/api/client'

type HostelInfo = {
  id: string
  name: string
  location: string
  capacity: number
  description?: string | null
  rules?: string | null
  college: { name: string }
}

export default function GuestHostelInfoPage() {
  const params = useParams<{ collegeId: string }>()
  const [hostel, setHostel] = useState<HostelInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!params?.collegeId) return
      setLoading(true)
      const { data } = await apiJson<{ ok: boolean; data: HostelInfo }>(
        `/api/public/hostel-info?collegeId=${encodeURIComponent(params.collegeId)}`
      )
      if (data?.ok) setHostel(data.data)
      setLoading(false)
    }
    load()
  }, [params?.collegeId])

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading hostel info...</div>
  }

  if (!hostel) {
    return <div style={{ color: 'var(--text-secondary)' }}>Hostel information not available.</div>
  }

  const rules = hostel.rules ? hostel.rules.split('\n').filter((line) => line.trim()) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '860px' }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>{hostel.name}</h1>
        <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{hostel.college.name}</div>
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
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

      <a
        href="/login"
        style={{
          alignSelf: 'flex-start',
          background: 'var(--sage)',
          color: 'white',
          textDecoration: 'none',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          fontWeight: 600,
        }}
      >
        Student Login
      </a>
    </div>
  )
}
