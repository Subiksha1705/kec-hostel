'use client'

import { useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Complaint = {
  id: string
  title: string
  description: string
  status: 'PENDING' | 'RESOLVED' | 'CANCELLED'
  createdAt: string
}

export default function StudentComplaintsPage() {
  const { data, loading, refresh, fetchedAt } =
    useCachedFetch<Complaint[]>('/api/complaints')
  const complaints = data ?? []
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (submitting) return
    setError('')
    if (!title.trim() || !description.trim()) {
      setError('Please fill both title and description')
      return
    }
    setSubmitting(true)
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), description: description.trim() }),
    })
    setSubmitting(false)
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to submit complaint')
      return
    }
    setTitle('')
    setDescription('')
    setIsOpen(false)
    cache.invalidate('/api/complaints')
    refresh()
  }

  const cancelComplaint = async (id: string) => {
    if (!window.confirm('Cancel this complaint request?')) return
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      `/api/complaints/${id}`,
      { method: 'DELETE' }
    )
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to cancel complaint')
      return
    }
    cache.invalidate('/api/complaints')
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          My Complaints
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
          <button
            onClick={() => setIsOpen(true)}
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
            Register Complaint
          </button>
        </div>
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'title', label: 'Title' },
          {
            key: 'description',
            label: 'Description',
            render: (item: Complaint) =>
              item.description.length > 60 ? `${item.description.slice(0, 60)}...` : item.description,
          },
          { key: 'status', label: 'Status', render: (item: Complaint) => <StatusBadge status={item.status} /> },
          { key: 'createdAt', label: 'Date', render: (item: Complaint) => new Date(item.createdAt).toLocaleDateString() },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Complaint) =>
              item.status === 'PENDING' ? (
                <button
                  onClick={() => cancelComplaint(item.id)}
                  style={{
                    background: 'var(--rose)',
                    color: '#7a2020',
                    border: '1px solid var(--border)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>
              ),
          },
        ]}
        data={complaints}
        emptyMessage="No complaints submitted yet."
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Register Complaint">
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              resize: 'vertical',
            }}
          />
          {error ? (
            <div
              style={{
                background: 'var(--rose)',
                color: '#7a2020',
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
              }}
            >
              {error}
            </div>
          ) : null}
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
