'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'

type HostelInfo = {
  name: string
  location: string
  capacity: number
  description: string | null
  rules: string | null
  chatbotContext?: string | null
}

const emptyForm: HostelInfo = {
  name: '',
  location: '',
  capacity: 0,
  description: '',
  rules: '',
  chatbotContext: '',
}

export default function AdminHostelInfoPage() {
  const { data: hostelInfo, loading, refresh, fetchedAt } =
    useCachedFetch<HostelInfo>('/api/hostel-info')
  const [form, setForm] = useState<HostelInfo>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!hostelInfo) return
    setForm({
      name: hostelInfo.name ?? '',
      location: hostelInfo.location ?? '',
      capacity: hostelInfo.capacity ?? 0,
      description: hostelInfo.description ?? '',
      rules: hostelInfo.rules ?? '',
      chatbotContext: hostelInfo.chatbotContext ?? '',
    })
  }, [hostelInfo])

  const save = async () => {
    setSaving(true)
    setSuccess(false)
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      capacity: Number(form.capacity) || 0,
      description: form.description ?? '',
      rules: form.rules ?? '',
      chatbotContext: form.chatbotContext ?? '',
    }
    const { res } = await apiJson('/api/hostel-info', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess(true)
      cache.invalidate('/api/hostel-info')
      refresh()
      setTimeout(() => setSuccess(false), 1500)
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading hostel info...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Hostel Info
        </h1>
        <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hostel Name</label>
          <input
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Location</label>
          <input
            value={form.location}
            onChange={(event) => setForm((f) => ({ ...f, location: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Capacity</label>
          <input
            type="number"
            value={form.capacity}
            onChange={(event) => setForm((f) => ({ ...f, capacity: Number(event.target.value) }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Description</label>
          <textarea
            rows={4}
            value={form.description ?? ''}
            onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rules</label>
          <textarea
            rows={6}
            value={form.rules ?? ''}
            onChange={(event) => setForm((f) => ({ ...f, rules: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Chatbot Context</label>
          <textarea
            rows={9}
            value={form.chatbotContext ?? ''}
            onChange={(event) => setForm((f) => ({ ...f, chatbotContext: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            This text is used as knowledge for the chatbot. Write hostel rules, FAQs, timings, and any
            information students commonly ask about.
          </div>
        </div>
        {success ? (
          <div
            style={{
              background: 'var(--mint)',
              color: '#1a5c3a',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
            }}
          >
            Hostel info updated successfully.
          </div>
        ) : null}
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: 'var(--sage)',
            color: 'white',
            border: 'none',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
