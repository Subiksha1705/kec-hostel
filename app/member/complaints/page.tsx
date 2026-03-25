'use client'

import { useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Complaint = {
  id: string
  title: string
  description: string
  status: 'PENDING' | 'RESOLVED'
  createdAt: string
  student: { name: string; rollNumber: string }
}

type Permission = { module: string; canEdit: boolean }

const filters = ['ALL', 'PENDING', 'RESOLVED'] as const

type Filter = (typeof filters)[number]

export default function MemberComplaintsPage() {
  const { data: complaints = [], loading: complaintsLoading, refresh: refreshComplaints, fetchedAt } =
    useCachedFetch<Complaint[]>('/api/complaints')
  const { data: perms = [], loading: permsLoading, refresh: refreshPerms } =
    useCachedFetch<Permission[]>('/api/permissions')
  const [filter, setFilter] = useState<Filter>('ALL')
  const canEdit = useMemo(
    () => perms.find((p) => p.module === 'complaints')?.canEdit ?? false,
    [perms]
  )
  const loading = complaintsLoading || permsLoading

  const handleRefresh = async () => {
    await Promise.all([refreshComplaints(), refreshPerms()])
  }

  const filteredComplaints = useMemo(() => {
    if (filter === 'ALL') return complaints
    return complaints.filter((complaint) => complaint.status === filter)
  }, [complaints, filter])

  const resolve = async (id: string) => {
    await apiJson(`/api/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'RESOLVED' }),
    })
    cache.invalidate('/api/complaints')
    refreshComplaints()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Complaints
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
          { key: 'student', label: 'Student', render: (item: Complaint) => item.student.name },
          { key: 'roll', label: 'Roll No', render: (item: Complaint) => item.student.rollNumber },
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
            render: (item: Complaint) => {
              if (item.status !== 'PENDING') {
                return <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Resolved</span>
              }
              if (!canEdit) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
              return (
                <button
                  onClick={() => resolve(item.id)}
                  style={{
                    background: 'var(--mint)',
                    color: '#1a5c3a',
                    border: '1px solid var(--border)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                >
                  Mark Resolved
                </button>
              )
            },
          },
        ]}
        data={filteredComplaints}
        emptyMessage="No complaints found."
      />
    </div>
  )
}
