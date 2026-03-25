'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import { Pencil } from 'lucide-react'

type StudentInfo = {
  id: string
  name: string
  email: string
  rollNumber: string
  phoneNumber: string
  department: string
  year: string
  roomNumber?: string | null
  bedNumber?: string | null
  gender: string
  parentName: string
  parentContact: string
  status: string
  profileImage: string
  address: string
  dateOfBirth: string
  emergencyContactName: string
  emergencyContactNumber: string
  bloodGroup: string
  checkInDate: string
  checkOutDate: string
  feeStatus: string
  passOutYear: number
  inYear: number
  idCardPdf: string
  createdAt: string
  updatedAt: string
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

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentInfoPage() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<StudentInfo>('/api/student-info')
  const [roomNumber, setRoomNumber] = useState('')
  const [bedNumber, setBedNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setRoomNumber(data.roomNumber ?? '')
    setBedNumber(data.bedNumber ?? '')
  }, [data])

  const saveRoomBed = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    const { res, data: response } = await apiJson<{ ok: boolean; error?: string }>('/api/student-info', {
      method: 'PUT',
      body: JSON.stringify({
        roomNumber: roomNumber.trim() || null,
        bedNumber: bedNumber.trim() || null,
      }),
    })
    if (!res.ok || !response?.ok) {
      setError(response?.error ?? 'Failed to update room details')
      setSaving(false)
      return
    }
    cache.invalidate('/api/student-info')
    await refresh()
    setMessage('Room details updated')
    setSaving(false)
  }

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

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Personal Info</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Name', value: data.name },
            { label: 'Gender', value: data.gender },
            { label: 'Date of Birth', value: formatDate(data.dateOfBirth) },
            { label: 'Blood Group', value: data.bloodGroup },
            { label: 'Status', value: data.status },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, wordBreak: 'break-word' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Contact Info</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {[
            { label: 'Email', value: data.email },
            { label: 'Phone Number', value: data.phoneNumber },
            { label: 'Address', value: data.address },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, wordBreak: 'break-word' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Academic Info</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Roll Number', value: data.rollNumber },
            { label: 'Department', value: data.department },
            { label: 'Year', value: data.year },
            { label: 'In Year', value: String(data.inYear) },
            { label: 'Pass Out Year', value: String(data.passOutYear) },
            { label: 'Class', value: data.class?.name ?? 'Not assigned' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Hostel Info</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Hostel', value: hostel?.name ?? 'Not assigned' },
            { label: 'Hostel Location', value: hostel?.location ?? 'Not available' },
            { label: 'Hostel Capacity', value: hostel ? `${hostel.capacity} students` : 'Not available' },
            { label: 'Fee Status', value: data.feeStatus },
            { label: 'Check-in Date', value: formatDate(data.checkInDate) },
            { label: 'Check-out Date', value: formatDate(data.checkOutDate) },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
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
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Hostel Description</div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {hostel?.description || 'No description provided yet.'}
            </div>
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              background: 'var(--surface-2)',
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

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '10px' }}>
          <Pencil size={16} />
          Room Details (Editable)
        </div>
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <input
            placeholder="Room Number"
            value={roomNumber}
            onChange={(event) => setRoomNumber(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <input
            placeholder="Bed Number"
            value={bedNumber}
            onChange={(event) => setBedNumber(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <button
            onClick={saveRoomBed}
            disabled={saving}
            style={{
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600,
              alignSelf: 'start',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {message ? (
          <div style={{ marginTop: '8px', color: 'var(--success-text)' }}>{message}</div>
        ) : null}
        {error ? (
          <div style={{ marginTop: '8px', color: 'var(--error-text)' }}>{error}</div>
        ) : null}
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Family & Emergency</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {[
            { label: 'Parent Name', value: data.parentName },
            { label: 'Parent Contact', value: data.parentContact },
            { label: 'Emergency Contact Name', value: data.emergencyContactName },
            { label: 'Emergency Contact Number', value: data.emergencyContactNumber },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, wordBreak: 'break-word' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Documents</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Profile Image', value: data.profileImage },
            { label: 'ID Card PDF', value: data.idCardPdf },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, wordBreak: 'break-word' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontWeight: 600 }}>Timeline</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Created At', value: formatDate(data.createdAt) },
            { label: 'Updated At', value: formatDate(data.updatedAt) },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
