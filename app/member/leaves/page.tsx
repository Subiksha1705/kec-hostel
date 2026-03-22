'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  student: { name: string; rollNumber: string }
  assignedTo?: { id: string; name: string } | null
}

const filters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

type Filter = (typeof filters)[number]

const getUserId = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  if (!token) return null
  try {
    const base64 = token.split('.')[1] ?? ''
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as { sub?: string }
    return payload.sub ?? null
  } catch {
    return null
  }
}

export default function MemberLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [userId, setUserId] = useState<string | null>(null)

  const load = async () => {
    const { data } = await apiJson<{ ok: boolean; data: Leave[] }>('/api/leaves')
    if (data?.ok) setLeaves(data.data)
  }

  useEffect(() => {
    setUserId(getUserId())
    load()
  }, [])

  const filteredLeaves = useMemo(() => {
    const base = filter === 'ALL' ? leaves : leaves.filter((leave) => leave.status === filter)
    return base
  }, [filter, leaves])

  const act = async (id: string, action: 'approve' | 'reject') => {
    const confirmText = action === 'approve' ? 'Approve this leave?' : 'Reject this leave?'
    if (!window.confirm(confirmText)) return
    await apiJson(`/api/leaves/${id}/${action}`, { method: 'PUT' })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
        Leaves
      </h1>

      <div style={{ display: 'flex', gap: '8px' }}>
        {filters.map((item) => {
          const active = item === filter
          return (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: active ? 'var(--sage-light)' : 'var(--surface)',
                color: active ? 'var(--sage-dark)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.toLowerCase()}
            </button>
          )
        })}
      </div>

      <Table
        columns={[
          { key: 'student', label: 'Student', render: (item: Leave) => item.student.name },
          { key: 'roll', label: 'Roll No', render: (item: Leave) => item.student.rollNumber },
          { key: 'reason', label: 'Reason' },
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Leave) => {
              const isMine = userId && item.assignedTo?.id === userId
              if (item.status === 'PENDING' && isMine) {
                return (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => act(item.id, 'approve')}
                      style={{
                        background: 'var(--mint)',
                        color: '#1a5c3a',
                        border: '1px solid var(--border)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(item.id, 'reject')}
                      style={{
                        background: 'var(--rose)',
                        color: '#7a2020',
                        border: '1px solid var(--border)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )
              }
              return <span style={{ color: 'var(--text-muted)' }}>—</span>
            },
          },
        ]}
        data={filteredLeaves}
        emptyMessage="No leaves found."
      />
    </div>
  )
}
