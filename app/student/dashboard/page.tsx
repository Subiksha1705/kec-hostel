'use client'

import { CalendarCheck, CheckCircle2, Clock } from 'lucide-react'
import { useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import StatCard from '@/components/ui/StatCard'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export default function StudentDashboardPage() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<Leave[]>('/api/leaves')
  const leaves = data ?? []

  const total = leaves.length
  const approved = leaves.filter((leave) => leave.status === 'APPROVED').length
  const pending = leaves.filter((leave) => leave.status === 'PENDING').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Total Submitted" value={total} icon={<CalendarCheck size={20} />} />
        <StatCard label="Approved" value={approved} icon={<CheckCircle2 size={20} />} />
        <StatCard label="Pending" value={pending} icon={<Clock size={20} />} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Recent Leaves
        </h2>
        <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'reason', label: 'Reason' },
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
        ]}
        data={leaves}
        emptyMessage="No leave requests yet."
      />
    </div>
  )
}
