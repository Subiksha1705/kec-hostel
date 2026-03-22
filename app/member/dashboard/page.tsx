'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, ClipboardCheck } from 'lucide-react'
import { apiJson } from '@/lib/api/client'
import StatCard from '@/components/ui/StatCard'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  student: { name: string }
  assignedTo?: { id: string } | null
  reviewedBy?: { id: string } | null
}

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

export default function MemberDashboardPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const load = async () => {
    const { data } = await apiJson<{ ok: boolean; data: Leave[] }>('/api/leaves')
    if (data?.ok) setLeaves(data.data)
  }

  useEffect(() => {
    setUserId(getUserId())
    load()
  }, [])

  const assignedLeaves = useMemo(() => {
    if (!userId) return []
    return leaves.filter((leave) => leave.assignedTo?.id === userId)
  }, [leaves, userId])

  const reviewedLeaves = useMemo(() => {
    if (!userId) return []
    return leaves.filter((leave) => leave.reviewedBy?.id === userId)
  }, [leaves, userId])

  const act = async (id: string, action: 'approve' | 'reject') => {
    const confirmText = action === 'approve' ? 'Approve this leave?' : 'Reject this leave?'
    if (!window.confirm(confirmText)) return
    await apiJson(`/api/leaves/${id}/${action}`, { method: 'PUT' })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard label="Assigned To Me" value={assignedLeaves.length} icon={<CalendarCheck size={20} />} />
        <StatCard label="Reviewed By Me" value={reviewedLeaves.length} icon={<ClipboardCheck size={20} />} />
      </div>

      <Table
        columns={[
          { key: 'student', label: 'Student', render: (item: Leave) => item.student.name },
          { key: 'reason', label: 'Reason' },
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Leave) =>
              item.status === 'PENDING' ? (
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
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>Reviewed</span>
              ),
          },
        ]}
        data={assignedLeaves}
        emptyMessage="No leaves assigned yet."
      />
    </div>
  )
}
