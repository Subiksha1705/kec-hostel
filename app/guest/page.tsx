'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'

type College = { id: string; name: string; location: string }

export default function GuestLandingPage() {
  const [colleges, setColleges] = useState<College[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await apiJson<{ ok: boolean; data: College[] }>('/api/public/colleges')
      if (data?.ok) setColleges(data.data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return colleges
    const q = query.toLowerCase()
    return colleges.filter((college) => college.name.toLowerCase().includes(q) || college.location.toLowerCase().includes(q))
  }, [colleges, query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Explore Hostels
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Search for your college and view hostel information without logging in.
        </p>
      </div>

      <input
        placeholder="Search colleges..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          maxWidth: '420px',
        }}
      />

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading colleges...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)' }}>No colleges found.</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {filtered.map((college) => (
            <div
              key={college.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontWeight: 600 }}>{college.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{college.location}</div>
              <a
                href={`/guest/${college.id}`}
                style={{
                  marginTop: '6px',
                  color: 'var(--sage-dark)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                View Hostel Info →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
