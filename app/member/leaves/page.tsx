'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'
import Toast from '@/components/ui/Toast'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  student: { name: string; rollNumber: string }
  assignedTo?: { id: string; name: string } | null
}

type Permission = { module: string; canApprove: boolean; canView: boolean }

const filters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

type Filter = (typeof filters)[number]

function getMyId(): string | null {
  try {
    const token = localStorage.getItem('accessToken') ?? ''
    const part = token.split('.')[1] ?? ''
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    return (JSON.parse(atob(padded)) as { sub?: string }).sub ?? null
  } catch {
    return null
  }
}

export default function MemberLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [myId, setMyId] = useState<string | null>(null)
  const [canApprove, setCanApprove] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const load = async () => {
    setLoading(true)
    const [leavesRes, permsRes] = await Promise.all([
      apiJson<{ ok: boolean; data: Leave[] }>('/api/leaves'),
      apiJson<{ ok: boolean; data: Permission[] }>('/api/permissions'),
    ])
    if (leavesRes.data?.ok) setLeaves(leavesRes.data.data)
    if (permsRes.data?.ok) {
      const leavesPerm = permsRes.data.data.find((p) => p.module === 'leaves')
      setCanApprove(leavesPerm?.canApprove ?? false)
    }
    setLoading(false)
  }

  useEffect(() => {
    setMyId(getMyId())
    load()
  }, [])

  const filteredLeaves = useMemo(() => {
    if (filter === 'ALL') return leaves
    return leaves.filter((l) => l.status === filter)
  }, [filter, leaves])

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (!window.confirm(action === 'approve' ? 'Approve this leave?' : 'Reject this leave?')) return
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      `/api/leaves/${id}/${action}`,
      { method: 'PUT' }
    )
    if (!res.ok || !data?.ok) {
      setToast({ message: data?.error ?? `Failed to ${action} leave`, variant: 'error' })
    } else {
      setToast({ message: `Leave ${action === 'approve' ? 'approved' : 'rejected'}`, variant: 'success' })
      load()
    }
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
        loading={loading}
        columns={[
          { key: 'student', label: 'Student', render: (item: Leave) => item.student.name },
          { key: 'roll', label: 'Roll No', render: (item: Leave) => item.student.rollNumber },
          { key: 'reason', label: 'Reason' },
          {
            key: 'fromDate',
            label: 'From',
            render: (item: Leave) => new Date(item.fromDate).toLocaleDateString(),
          },
          {
            key: 'toDate',
            label: 'To',
            render: (item: Leave) => new Date(item.toDate).toLocaleDateString(),
          },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          {
            key: 'assigned',
            label: 'Assigned',
            render: (item: Leave) => {
              const isMine = myId && item.assignedTo?.id === myId
              if (!item.assignedTo) {
                return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>
              }
              return (
                <span
                  style={{
                    fontSize: '12px',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: isMine ? 'var(--sage-light)' : 'var(--surface-2)',
                    color: isMine ? 'var(--sage-dark)' : 'var(--text-secondary)',
                    fontWeight: isMine ? 600 : 400,
                  }}
                >
                  {isMine ? 'You' : item.assignedTo.name}
                </span>
              )
            },
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Leave) => {
              const isMine = myId && item.assignedTo?.id === myId
              if (item.status === 'PENDING' && isMine && canApprove) {
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
                        fontWeight: 500,
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
                        fontWeight: 500,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )
              }
              if (item.status === 'PENDING' && isMine && !canApprove) {
                return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No approve permission</span>
              }
              return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
            },
          },
        ]}
        data={filteredLeaves}
        emptyMessage="No leaves found."
      />

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
