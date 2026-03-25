'use client'

import { useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
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
  reviewedBy?: { name: string } | null
  reviewedAt?: string | null
}

type Member = { id: string; name: string }

const filters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

type Filter = (typeof filters)[number]

export default function AdminLeavesPage() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [assigning, setAssigning] = useState<Leave | null>(null)
  const [memberId, setMemberId] = useState('')
  const { data: leavesData, loading: leavesLoading, refresh: refreshLeaves, fetchedAt } =
    useCachedFetch<Leave[]>('/api/leaves')
  const { data: membersData, refresh: refreshMembers } =
    useCachedFetch<Member[]>('/api/members')
  const leaves = leavesData ?? []
  const members = membersData ?? []

  const loading = leavesLoading

  const handleRefresh = async () => {
    await Promise.all([refreshLeaves(), refreshMembers()])
  }

  const filteredLeaves = useMemo(() => {
    if (filter === 'ALL') return leaves
    return leaves.filter((leave) => leave.status === filter)
  }, [filter, leaves])

  const assign = async () => {
    if (!assigning || !memberId) return
    await apiJson(`/api/leaves/${assigning.id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ memberId }),
    })
    setAssigning(null)
    setMemberId('')
    cache.invalidate('/api/leaves')
    refreshLeaves()
  }

  const approveDirect = async (id: string) => {
    await apiJson(`/api/leaves/${id}/approve`, { method: 'PUT', body: JSON.stringify({}) })
    cache.invalidate('/api/leaves')
    refreshLeaves()
  }

  const rejectDirect = async (id: string) => {
    await apiJson(`/api/leaves/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason: '' }),
    })
    cache.invalidate('/api/leaves')
    refreshLeaves()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Leaves
        </h1>
        <RefreshButton onRefresh={handleRefresh} fetchedAt={fetchedAt} />
      </div>

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
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          {
            key: 'assignedTo',
            label: 'Assigned To',
            render: (item: Leave) => item.assignedTo?.name ?? 'Unassigned',
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Leave) => {
              if (item.status !== 'PENDING') {
                return (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Reviewed by {item.reviewedBy?.name ?? 'Member'}
                  </span>
                )
              }
              return (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {!item.assignedTo && (
                    <button
                      onClick={() => setAssigning(item)}
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        padding: '5px 10px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Assign
                    </button>
                  )}
                  <button
                    onClick={() => approveDirect(item.id)}
                    style={{
                      background: 'var(--mint)',
                      color: '#1a5c3a',
                      border: '1px solid var(--border)',
                      padding: '5px 10px',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectDirect(item.id)}
                    style={{
                      background: 'var(--rose)',
                      color: '#7a2020',
                      border: '1px solid var(--border)',
                      padding: '5px 10px',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Reject
                  </button>
                </div>
              )
            },
          },
        ]}
        data={filteredLeaves}
        emptyMessage="No leave requests found."
      />

      <Modal
        isOpen={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title="Assign Leave"
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          <select
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <option value="">Assign to member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <button
            onClick={assign}
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
            Assign
          </button>
        </div>
      </Modal>
    </div>
  )
}
