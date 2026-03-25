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

const filters = ['ALL', 'PENDING', 'RESOLVED'] as const

type Filter = (typeof filters)[number]

export default function AdminComplaintsPage() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const { data: complaints = [], loading, refresh, fetchedAt } =
    useCachedFetch<Complaint[]>('/api/complaints')

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
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Complaints
        </h1>
        <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
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
            render: (item: Complaint) =>
              item.status === 'PENDING' ? (
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
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Resolved</span>
              ),
          },
        ]}
        data={filteredComplaints}
        emptyMessage="No complaints found."
      />
    </div>
  )
}
