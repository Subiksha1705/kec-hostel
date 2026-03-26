'use client'

import { useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'
import Select from '@/components/ui/Select'

type Leave = {
  id: string
  title: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  assignedTo?: { name: string } | null
  reviewedBy?: { name: string } | null
  createdAt: string
}

type StudentInfo = {
  facultyInCharge?: { member: { id: string; name: string; email?: string } }[]
}

export default function StudentLeavesPage() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<Leave[]>('/api/leaves')
  const { data: studentInfo } = useCachedFetch<StudentInfo>('/api/student-info')
  const leaves = data ?? []
  const facultyOptions =
    studentInfo?.facultyInCharge?.map((item) => ({
      value: item.member.id,
      label: `${item.member.name}${item.member.email ? ` (${item.member.email})` : ''}`,
    })) ?? []
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (submitting) return
    setError('')
    if (!title.trim() || !reason.trim() || !fromDate || !toDate || !assignedToId) {
      setError('Please fill all fields')
      return
    }
    if (toDate < fromDate) {
      setError('To date must be after from date')
      return
    }

    const payload = {
      title: title.trim(),
      reason: reason.trim(),
      fromDate: new Date(`${fromDate}T00:00:00`).toISOString(),
      toDate: new Date(`${toDate}T00:00:00`).toISOString(),
      assignedToId,
    }

    setSubmitting(true)
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSubmitting(false)

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to submit leave')
      return
    }

    setIsOpen(false)
    setTitle('')
    setReason('')
    setFromDate('')
    setToDate('')
    setAssignedToId('')
    cache.invalidate('/api/leaves')
    refresh()
  }

  const cancelLeave = async (id: string) => {
    if (!window.confirm('Cancel this leave request?')) return
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      `/api/leaves/${id}/cancel`,
      { method: 'DELETE' }
    )
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to cancel leave')
      return
    }
    cache.invalidate('/api/leaves')
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          My Leaves
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
            Apply for Leave
          </button>
        </div>
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'reason', label: 'Reason' },
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          { key: 'assignedTo', label: 'Assigned To', render: (item: Leave) => item.assignedTo?.name ?? '—' },
          { key: 'reviewedBy', label: 'Reviewed By', render: (item: Leave) => item.reviewedBy?.name ?? '—' },
          { key: 'createdAt', label: 'Submitted On', render: (item: Leave) => new Date(item.createdAt).toLocaleDateString() },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Leave) =>
              item.status === 'PENDING' ? (
                <button
                  onClick={() => cancelLeave(item.id)}
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
        data={leaves}
        emptyMessage="No leave requests yet."
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Apply for Leave">
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
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              resize: 'vertical',
            }}
          />
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            min={fromDate}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <Select
            value={assignedToId}
            onChange={(value) => setAssignedToId(value)}
            options={[
              { value: '', label: facultyOptions.length ? 'Assign to faculty' : 'No faculty available' },
              ...facultyOptions,
            ]}
            disabled={!facultyOptions.length}
          />
          {error ? (
            <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '8px 10px', borderRadius: 'var(--radius)' }}>
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
            {submitting ? 'Submitting...' : 'Submit Leave'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
