'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, CheckCircle2, Clock } from 'lucide-react'
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
}

export default function StudentDashboardPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])

  useEffect(() => {
    apiJson<{ ok: boolean; data: Leave[] }>('/api/leaves').then(({ data }) => {
      if (data?.ok) setLeaves(data.data)
    })
  }, [])

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

      <Table
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
